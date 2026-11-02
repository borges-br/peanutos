import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  prisma,
  emailLogoAssetId,
  emailLogoVariant,
  emailAppearance,
} from "@peanut/db";
import {
  publicBrandOrigin,
  publicBrandAssetPath,
  publicBrandAssetUrl,
  renderBillingEmail,
  DEFAULT_BILLING_EMAIL,
} from "@peanut/utils";
import { VisualConfig, normalizeVisualConfig } from "@peanut/validators";
import sharp from "sharp";
import { StorageService } from "../storage/storage.service";
import { canonicalStaticSvg } from "../storage/static-svg";

@Injectable()
export class PublicBrandService {
  constructor(private readonly storage: StorageService) {}

  async png(workspaceId: string, assetId: string, background?: string) {
    const asset = await prisma.brandAsset.findFirst({
      where: { id: assetId, workspaceId },
    });
    const file =
      asset &&
      (await prisma.fileObject.findFirst({
        where: { id: asset.fileObjectId, workspaceId },
      }));
    if (!file)
      throw new BadRequestException(
        "Imagem não encontrada na biblioteca desta empresa.",
      );
    const chunks: Buffer[] = [];
    for await (const chunk of await this.storage.objects.get(
      file.bucket,
      file.key,
    ))
      chunks.push(Buffer.from(chunk));
    let input = Buffer.concat(chunks);
    if (input.length > 2 * 1024 * 1024)
      throw new BadRequestException("Imagem muito grande.");
    try {
      if (file.mimeType === "image/svg+xml")
        input = Buffer.from(canonicalStaticSvg(input.toString("utf8")));
      let image = sharp(input, {
        limitInputPixels: 16_000_000,
        density: 144,
        pages: 1,
        failOn: "warning",
      })
        .rotate()
        .resize({
          width: background ? 640 : 1024,
          height: background ? 256 : 1024,
          fit: "inside",
          withoutEnlargement: file.mimeType !== "image/svg+xml",
        });
      if (background) image = image.flatten({ background });
      let result = await image
        .png({ compressionLevel: 9 })
        .toBuffer({ resolveWithObject: true });
      if (result.data.length > 2 * 1024 * 1024) {
        result = await sharp(result.data)
          .resize({
            width: 700,
            height: 700,
            fit: "inside",
            withoutEnlargement: true,
          })
          .png({ compressionLevel: 9 })
          .toBuffer({ resolveWithObject: true });
      }
      return result;
    } catch {
      throw new BadRequestException(
        "Não foi possível preparar esta imagem. Use uma imagem válida de até 16 megapixels.",
      );
    }
  }

  async prepare(
    workspaceId: string,
    actorUserId: string,
    sourceAssetId: string,
    variant: string,
    background?: string,
  ) {
    const where = {
      workspaceId_sourceAssetId_variant: {
        workspaceId,
        sourceAssetId,
        variant,
      },
    };
    const existing = await prisma.publicBrandAsset.findUnique({ where });
    if (existing) return existing;
    const { data, info } = await this.png(
      workspaceId,
      sourceAssetId,
      background,
    );
    const stored = await this.storage.uploadImage({
      workspaceId,
      actorUserId,
      folder: "public-brand-variants",
      data: data.toString("base64"),
      filename: "brand.png",
      mimeType: "image/png",
    });
    const file = await prisma.fileObject.findUniqueOrThrow({
      where: { id: stored.fileObjectId },
    });
    try {
      return await prisma.publicBrandAsset.create({
        data: {
          workspaceId,
          sourceAssetId,
          variant,
          fileObjectId: file.id,
          sha256: file.sha256,
          width: info.width,
          height: info.height,
        },
      });
    } catch (error: any) {
      if (error.code === "P2002")
        return prisma.publicBrandAsset.findUniqueOrThrow({ where });
      throw error;
    }
  }

  /** Preparation is private. Publication activates these IDs in the branding transaction. */
  async prepareConfig(
    workspaceId: string,
    actorUserId: string,
    config: VisualConfig,
  ) {
    const rows: Array<{ id: string }> = [];
    if (!config.login.enabled && !config.email.enabled) return [] as string[];
    publicBrandOrigin();
    if (config.login.enabled) {
      for (const id of new Set(
        Object.values(config.assets).filter(Boolean) as string[],
      ))
        rows.push(await this.prepare(workspaceId, actorUserId, id, "image"));
    }
    if (config.email.enabled) {
      const logoId = emailLogoAssetId(config);
      if (!logoId)
        throw new BadRequestException(
          "Selecione a logo do email na biblioteca da empresa.",
        );
      rows.push(
        await this.prepare(
          workspaceId,
          actorUserId,
          logoId,
          emailLogoVariant(config),
          config.light.surface,
        ),
      );
      if (config.assets.iconLight) rows.push(await this.prepare(workspaceId, actorUserId, config.assets.iconLight, "image"));
      for (const id of new Set(config.email.imageAssetIds))
        rows.push(await this.prepare(workspaceId, actorUserId, id, "image"));
    }
    return [...new Set(rows.map((row) => row.id))];
  }

  async assets(workspaceId: string) {
    return (
      await prisma.publicBrandAsset.findMany({
        where: { workspaceId, publishedAt: { not: null } },
        orderBy: { createdAt: "desc" },
      })
    ).map((row) => ({
      id: row.id,
      sourceAssetId: row.sourceAssetId,
      variant: row.variant,
      url: publicBrandAssetUrl(row),
      width: row.width,
      height: row.height,
    }));
  }

  async loginWorkspaceId() {
    const configured = process.env.PUBLIC_BRAND_WORKSPACE_ID;
    if (configured)
      return (
        (
          await prisma.workspace.findUnique({
            where: { id: configured },
            select: { id: true },
          })
        )?.id || null
      );
    const rows = await prisma.workspace.findMany({
      take: 2,
      select: { id: true },
    });
    return rows.length === 1 ? rows[0]!.id : null;
  }

  async login() {
    const workspaceId = await this.loginWorkspaceId();
    if (!workspaceId) return { brand: null };
    const row = await prisma.workspaceVisualSettings.findUnique({
      where: { workspaceId },
    });
    if (!row?.published) return { brand: null };
    const config = normalizeVisualConfig(row.published);
    if (!config.login.enabled) return { brand: null };
    const rows = await prisma.publicBrandAsset.findMany({
      where: { workspaceId, variant: "image", publishedAt: { not: null } },
    });
    const logos = Object.fromEntries(
      Object.entries(config.assets)
        .map(([slot, id]) => [slot, rows.find((r) => r.sourceAssetId === id)])
        .map(([slot, asset]) => [
          slot,
          asset ? publicBrandAssetPath(asset as any) : null,
        ]),
    );
    const palette = (p: VisualConfig["light"]) => ({
      canvas: p.canvas,
      surface: p.surface,
      text: p.text,
      muted: p.muted,
      border: p.border,
      action: p.action,
      onAction: p.onAction,
      sidebar: p.sidebar,
    });
    return {
      brand: {
        name: config.name,
        subtitle: config.subtitle,
        font: config.font,
        theme: config.theme,
        headingFont: config.customization.typography.headingFont,
        radius: config.interface.radius,
        light: palette(config.light),
        dark: palette(config.dark),
        login: config.login,
        logos,
      },
    };
  }

  async serve(id: string, hash: string, res: any, etag?: string) {
    if (
      !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(id) ||
      !/^[a-f\d]{64}$/.test(hash)
    )
      throw new NotFoundException();
    const asset = await prisma.publicBrandAsset.findFirst({
      where: { id, sha256: hash, publishedAt: { not: null } },
    });
    const file =
      asset &&
      (await prisma.fileObject.findFirst({
        where: {
          id: asset.fileObjectId,
          workspaceId: asset.workspaceId,
          sha256: hash,
          mimeType: "image/png",
        },
      }));
    if (!file) throw new NotFoundException();
    res
      .header("Cache-Control", "public, max-age=31536000, immutable")
      .header("ETag", `"${hash}"`)
      .header("Content-Type", "image/png")
      .header("X-Content-Type-Options", "nosniff");
    if (etag === `"${hash}"`) return res.code(304).send();
    try {
      return res.send(await this.storage.objects.get(file.bucket, file.key));
    } catch {
      throw new NotFoundException();
    }
  }

  async emailPreview(workspaceId: string, config: VisualConfig) {
    const logoId = emailLogoAssetId(config);
    const logo =
      config.email.enabled && logoId
        ? await this.png(workspaceId, logoId, config.light.surface)
        : null;
    const visual = config.email.enabled
      ? emailAppearance(
          config,
          logo
            ? {
                url: `data:image/png;base64,${logo.data.toString("base64")}`,
                width: logo.info.width,
                height: logo.info.height,
              }
            : null,
        )
      : null;
    return renderBillingEmail(
      DEFAULT_BILLING_EMAIL,
      {
        empresa: config.name,
        cliente: "Cliente Demonstração",
        fatura: "FAT-DEMO",
        contrato: "CTR-DEMO",
        competencia: "2026-11",
        total: "R$ 1.250,00",
        vencimento: "10/11/2026",
        fuso: "America/Sao_Paulo",
      },
      visual,
    );
  }
}

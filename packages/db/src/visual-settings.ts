import type { PrismaClient, Prisma } from "@prisma/client";
import { LocalObjectStorage } from "@peanut/utils";

export class VisualSettingsError extends Error {
  constructor(
    message: string,
    public conflict = false,
  ) {
    super(message);
  }
}

/** Resolve the same published identity in API previews and the PDF worker. Never read another workspace's file. */
export async function getPublishedDocumentIdentity(
  db: PrismaClient,
  workspaceId: string,
) {
  const row = await db.workspaceVisualSettings.findUnique({
    where: { workspaceId },
  });
  if (!row?.published) return null;
  const config = row.published as any;
  const assetId = config.assets?.logoLight;
  let logoUrl: string | null = null;
  if (assetId) {
    const asset = await db.brandAsset.findFirst({
      where: { id: assetId, workspaceId },
    });
    const file =
      asset &&
      (await db.fileObject.findFirst({
        where: { id: asset.fileObjectId, workspaceId },
      }));
    if (!file)
      throw new VisualSettingsError("Arquivo da marca aplicada indisponível.");
    const objects = new LocalObjectStorage(),
      stream = await objects.get(file.bucket, file.key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    logoUrl = `data:${file.mimeType};base64,${Buffer.concat(chunks).toString("base64")}`;
  }
  return {
    publicName: config.name as string,
    brandSubtitle: config.subtitle as string,
    documentPrimaryColor: config.documents.accent as string,
    footerText: config.documents.footer as string,
    visual: {
      ...config.documents,
      font:
        !config.documents.font || config.documents.font === "inherit"
          ? config.font
          : config.documents.font,
    },
    ...(assetId ? { logoUrl } : {}),
  };
}

/** Call after schema validation. Asset references are always rechecked in the workspace transaction. */
export async function writeVisualSettings(
  db: PrismaClient,
  workspaceId: string,
  actorUserId: string,
  input: {
    revision: number;
    action: "save" | "publish" | "restore";
    config?: any;
    version?: number;
  },
) {
  return db.$transaction(async (tx) => {
    const workspace = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`;
    if (!workspace.length)
      throw new VisualSettingsError("Empresa não encontrada.");
    const current = await tx.workspaceVisualSettings.findUnique({
      where: { workspaceId },
    });
    if ((current?.revision ?? 0) !== input.revision)
      throw new VisualSettingsError(
        "Outra pessoa alterou a marca. Recarregue antes de salvar.",
        true,
      );
    let config = input.action === "publish" ? current?.draft : input.config;
    if (input.action === "restore") {
      const version = await tx.workspaceVisualVersion.findUnique({
        where: {
          workspaceId_version: { workspaceId, version: input.version! },
        },
      });
      if (!version)
        throw new VisualSettingsError("Versão não encontrada nesta empresa.");
      config = version.config;
    }
    if (!config || typeof config !== "object")
      throw new VisualSettingsError("Salve um rascunho antes de aplicar.");
    const ids = [
      ...new Set(Object.values((config as any).assets || {}).filter(Boolean)),
    ] as string[];
    const assets = await tx.brandAsset.findMany({
      where: { workspaceId, id: { in: ids } },
      select: { id: true },
    });
    if (assets.length !== ids.length)
      throw new VisualSettingsError(
        "Uma imagem não pertence à biblioteca desta empresa.",
      );
    const nextVersion =
      (current?.publishedVersion ?? 0) + (input.action === "publish" ? 1 : 0);
    const data = {
      draft: config as Prisma.InputJsonValue,
      revision: input.revision + 1,
      ...(input.action === "publish"
        ? {
            published: config as Prisma.InputJsonValue,
            publishedVersion: nextVersion,
          }
        : {}),
    };
    const saved = await tx.workspaceVisualSettings.upsert({
      where: { workspaceId },
      create: { workspaceId, ...data },
      update: data,
    });
    if (input.action === "publish")
      await tx.workspaceVisualVersion.create({
        data: {
          workspaceId,
          version: nextVersion,
          config: config as Prisma.InputJsonValue,
          createdById: actorUserId,
        },
      });
    await tx.auditLog.create({
      data: {
        workspaceId,
        actorUserId,
        action: `brand.visual_${input.action}`,
        entityType: "WORKSPACE",
        entityId: workspaceId,
        beforeJson: JSON.stringify({
          revision: current?.revision ?? 0,
          publishedVersion: current?.publishedVersion ?? 0,
        }),
        afterJson: JSON.stringify({
          revision: saved.revision,
          publishedVersion: saved.publishedVersion,
        }),
        severity: "INFO",
      },
    });
    return saved;
  });
}

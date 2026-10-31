import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { prisma, writeVisualSettings, VisualSettingsError } from "@peanut/db";
import {
  DEFAULT_VISUAL_CONFIG,
  VisualConfig,
  visualConfigSchema,
  visualIssues,
  normalizeVisualConfig,
  documentVisualConfig,
} from "@peanut/validators";
import {
  renderA4Document,
  renderEditorialDocument,
  DocumentVisual,
} from "@peanut/documents";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class VisualSettingsService {
  constructor(private readonly storage: StorageService) {}

  async defaults(workspaceId: string): Promise<VisualConfig> {
    const ws = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });
    return {
      ...DEFAULT_VISUAL_CONFIG,
      name: ws.brandName || DEFAULT_VISUAL_CONFIG.name,
      subtitle: ws.brandSubtitle || "",
      documents: {
        ...DEFAULT_VISUAL_CONFIG.documents,
        accent: ws.primaryColorHex || DEFAULT_VISUAL_CONFIG.documents.accent,
        footer: ws.documentFooterText || "",
      },
    };
  }
  async get(workspaceId: string) {
    const [row, assets, versions] = await Promise.all([
      prisma.workspaceVisualSettings.findUnique({ where: { workspaceId } }),
      this.assets(workspaceId),
      prisma.workspaceVisualVersion.findMany({
        where: { workspaceId },
        orderBy: { version: "desc" },
        take: 30,
        select: { version: true, createdAt: true },
      }),
    ]);
    return {
      revision: row?.revision ?? 0,
      publishedVersion: row?.publishedVersion ?? 0,
      draft: normalizeVisualConfig(
        row?.draft ?? (await this.defaults(workspaceId)),
      ),
      published: row?.published ? normalizeVisualConfig(row.published) : null,
      assets,
      versions,
    };
  }
  async active(workspaceId: string) {
    const row = await prisma.workspaceVisualSettings.findUnique({
      where: { workspaceId },
    });
    return {
      config: row?.published ? normalizeVisualConfig(row.published) : null,
      version: row?.publishedVersion ?? 0,
      assets: row?.published ? await this.assets(workspaceId) : [],
    };
  }
  async assets(workspaceId: string) {
    const assets = await prisma.brandAsset.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });
    return assets.map(({ fileObjectId, ...asset }) => ({
      ...asset,
      url: `/api/v1/files/${fileObjectId}`,
    }));
  }
  async upload(
    workspaceId: string,
    actorUserId: string,
    input: {
      title: string;
      filename: string;
      mimeType: string;
      data: string;
      parentAssetId?: string | null;
    },
  ) {
    if (
      input.parentAssetId &&
      !(await prisma.brandAsset.findFirst({
        where: { id: input.parentAssetId, workspaceId },
      }))
    )
      throw new BadRequestException(
        "Imagem original não encontrada nesta empresa.",
      );
    const buffer = Buffer.from(
      input.data.replace(/^data:[^;]+;base64,/, ""),
      "base64",
    );
    if (!buffer.length) throw new BadRequestException("Imagem vazia.");
    if (input.mimeType !== "image/svg+xml") {
      const valid =
        input.mimeType === "image/png"
          ? buffer
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : input.mimeType === "image/jpeg"
            ? buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
            : buffer.toString("ascii", 0, 4) === "RIFF" &&
              buffer.toString("ascii", 8, 12) === "WEBP";
      if (!valid)
        throw new BadRequestException(
          "O conteúdo não corresponde ao formato da imagem.",
        );
    }
    const stored = await this.storage.uploadImage({
      workspaceId,
      actorUserId,
      folder: "brand-library",
      ...input,
    });
    const asset = await prisma.brandAsset.create({
      data: {
        workspaceId,
        fileObjectId: stored.fileObjectId,
        title: input.title,
        mimeType: input.mimeType,
        parentAssetId: input.parentAssetId || null,
      },
    });
    await prisma.auditLog.create({
      data: {
        workspaceId,
        actorUserId,
        action: "brand.asset_created",
        entityType: "BRAND_ASSET",
        entityId: asset.id,
        afterJson: JSON.stringify({
          title: asset.title,
          parentAssetId: asset.parentAssetId,
        }),
        severity: "INFO",
      },
    });
    const { fileObjectId, ...safe } = asset;
    return { ...safe, url: `/api/v1/files/${fileObjectId}` };
  }
  async write(
    workspaceId: string,
    actorUserId: string,
    input: {
      revision: number;
      action: "save" | "publish" | "restore";
      config?: VisualConfig;
      version?: number;
    },
  ) {
    if (input.action === "publish") {
      const current = await prisma.workspaceVisualSettings.findUnique({
        where: { workspaceId },
      });
      if ((current?.revision ?? 0) !== input.revision)
        throw new ConflictException(
          "Outra pessoa alterou a marca. Recarregue antes de aplicar.",
        );
      const config = visualConfigSchema.safeParse(current?.draft);
      if (!config.success)
        throw new BadRequestException(
          "Salve um rascunho válido antes de aplicar.",
        );
      const issues = visualIssues(config.data);
      if (
        (config.data.assets.logoLight || config.data.assets.logoDark) &&
        !config.data.assets.iconLight
      )
        issues.push("Selecione o símbolo compacto para o celular.");
      if (issues.length) throw new BadRequestException(issues.join(" "));
    }
    try {
      await writeVisualSettings(prisma, workspaceId, actorUserId, input);
    } catch (error) {
      if (error instanceof VisualSettingsError)
        throw error.conflict
          ? new ConflictException(error.message)
          : new BadRequestException(error.message);
      throw error;
    }
    return this.get(workspaceId);
  }
  async image(
    workspaceId: string,
    assetId: string | null,
    legacyId?: string | null,
  ) {
    const asset = assetId
      ? await prisma.brandAsset.findFirst({
          where: { id: assetId, workspaceId },
        })
      : null;
    if (assetId && !asset)
      throw new BadRequestException(
        "Imagem não encontrada na biblioteca desta empresa.",
      );
    const fileId = asset?.fileObjectId || legacyId;
    if (!fileId) return null;
    const file = await prisma.fileObject.findFirst({
      where: { id: fileId, workspaceId },
    });
    if (!file) throw new NotFoundException("Arquivo da marca indisponível.");
    const stream = await this.storage.objects.get(file.bucket, file.key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return `data:${file.mimeType};base64,${Buffer.concat(chunks).toString("base64")}`;
  }
  async preview(
    workspaceId: string,
    config: VisualConfig,
    type: "INVOICE" | "QUOTE" | "SERVICE_ORDER" | "REPORT" | "PROPOSAL",
    template?: {
      enabledBlocks: Record<string, boolean>;
      blockOrder: string[];
      settings?: any;
    },
  ) {
    const ids = [
      ...new Set(Object.values(config.assets).filter(Boolean)),
    ] as string[];
    if (
      (await prisma.brandAsset.count({
        where: { workspaceId, id: { in: ids } },
      })) !== ids.length
    )
      throw new BadRequestException(
        "Uma imagem não pertence à biblioteca desta empresa.",
      );
    const ws = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });
    const logo = await this.image(
      workspaceId,
      config.assets.logoLight,
      ws.logoFileObjectId,
    );
    const visual: DocumentVisual = documentVisualConfig(config);
    if (type === "PROPOSAL" || (type === "REPORT" && !template))
      return renderEditorialDocument({
        title:
          type === "REPORT"
            ? "Relatório técnico de infraestrutura"
            : "Proposta técnica e comercial",
        kind: type,
        number: "PRÉVIA",
        project: "Integração dos sistemas da operação",
        date: "30/10/2026",
        status: "DRAFT",
        company: {
          name: config.name,
          logo,
          email: "contato@empresa.example",
          website: "empresa.example",
        },
        client: "Rede Horizonte · Dados de exemplo",
        visual,
        sections:
          type === "REPORT"
            ? [
                {
                  title: "Contexto",
                  body: "Avaliação do ambiente de uma operação fictícia, com foco na continuidade dos serviços e na integração das informações.",
                },
                {
                  title: "Diagnóstico",
                  body: "O levantamento de exemplo identifica registros duplicados entre sistemas e uma rotina de recuperação que precisa ser documentada.",
                },
                {
                  title: "Recomendação",
                  body: "Centralizar cadastros e estabelecer uma rotina de validação do backup, com responsáveis e critérios de aceite.",
                },
                {
                  title: "Validação e limites",
                  body: "Conteúdo demonstrativo. Nenhum ambiente de cliente foi analisado.",
                },
                {
                  title: "Próximos passos",
                  body: "Revisar o diagnóstico com a equipe e definir responsáveis, prioridades e prazos.",
                },
              ]
            : [
                {
                  title: "Objetivo",
                  body: "Integrar processos e informações para reduzir retrabalho e facilitar a gestão da operação.",
                },
                {
                  title: "Escopo e entregas",
                  body: "Diagnóstico dos processos\nPlano de integração\nImplantação acompanhada e documentação",
                },
                {
                  title: "Limites e dependências",
                  body: "A execução depende da disponibilização dos acessos e da validação das entregas pela equipe responsável.",
                },
                {
                  title: "Condições comerciais",
                  body: "Valores, prazos e condições são definidos no orçamento vinculado à proposta.",
                },
                {
                  title: "Próximos passos",
                  body: "Revisar o escopo e confirmar as condições para início do projeto.",
                },
              ],
      });
    const blocks = [
      "header",
      "logo",
      "companyInfo",
      "clientInfo",
      "documentTitle",
      "itemsTable",
      "financialSummary",
      "observations",
      "footer",
    ];
    return renderA4Document({
      documentType: type,
      brand: {
        publicName: config.name,
        brandSubtitle: config.subtitle,
        logoUrl: logo,
        documentPrimaryColor: config.documents.accent,
        footerText: config.documents.footer,
        visual,
      },
      responsible: null,
      client: { tradeName: "Rede Horizonte · Exemplo" },
      data: {
        number: "EXEMPLO-001",
        title:
          type === "QUOTE"
            ? "Orçamento de serviços"
            : type === "INVOICE"
              ? "Fatura de serviços"
              : type === "REPORT"
                ? "Relatório operacional"
                : "Ordem de serviço",
        status: "DRAFT",
        issueDate: "30/10/2026",
        dueDate: "10/11/2026",
        totalAmount: "R$ 2.400,00",
        items: [
          {
            type: "SERVICE",
            description: "Diagnóstico e documentação da operação",
            quantity: "8",
            unit: "H",
            unitPrice: "R$ 150,00",
            totalPrice: "R$ 1.200,00",
          },
          {
            type: "SERVICE",
            description: "Plano de integração e acompanhamento",
            quantity: "8",
            unit: "H",
            unitPrice: "R$ 150,00",
            totalPrice: "R$ 1.200,00",
          },
        ],
        observations:
          "Prévia com dados fictícios. Não representa cobrança ou serviço realizado.",
      },
      templateSettings: {
        documentType: type,
        templateKey: "standard",
        layoutVariant: "default",
        enabledBlocks:
          template?.enabledBlocks ||
          Object.fromEntries(blocks.map((b) => [b, true])),
        blockOrder: template?.blockOrder || blocks,
        settings: template?.settings,
      },
      generatedAt: "30/10/2026",
      locale: "pt-BR",
      timeZone: ws.timeZone,
    });
  }
}

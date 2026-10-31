import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { prisma, Prisma } from "@peanut/db";
import {
  AuthoredDocumentInput,
  VisualConfig,
  documentVisualConfig,
} from "@peanut/validators";
import { renderEditorialDocument } from "@peanut/documents";
import { VisualSettingsService } from "../settings/visual-settings.service";

@Injectable()
export class AuthoredDocumentsService {
  constructor(private readonly visuals: VisualSettingsService) {}
  private allowed(kind: string, role: string) {
    if (kind === "PROPOSAL" && !["OWNER", "ADMIN", "FINANCIAL"].includes(role))
      throw new ForbiddenException(
        "Seu perfil não tem acesso às propostas comerciais.",
      );
  }
  async list(workspaceId: string, role: string) {
    return prisma.authoredDocument.findMany({
      where: {
        workspaceId,
        ...(!["OWNER", "ADMIN", "FINANCIAL"].includes(role)
          ? { kind: "REPORT" }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        kind: true,
        title: true,
        clientId: true,
        project: true,
        status: true,
        revision: true,
        updatedAt: true,
      },
    });
  }
  async get(workspaceId: string, id: string, role: string) {
    const row = await prisma.authoredDocument.findFirst({
      where: { id, workspaceId },
    });
    if (!row) throw new NotFoundException("Documento não encontrado.");
    this.allowed(row.kind, role);
    const { frozenHtml, ...safe } = row;
    return safe;
  }
  private async validate(
    workspaceId: string,
    role: string,
    input: AuthoredDocumentInput,
  ) {
    this.allowed(input.kind, role);
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, workspaceId },
    });
    if (!client)
      throw new BadRequestException("Selecione um cliente desta empresa.");
    if (input.kind === "REPORT" && input.quoteId)
      throw new BadRequestException(
        "Orçamento só pode ser vinculado a uma proposta.",
      );
    if (
      input.quoteId &&
      !(await prisma.quote.findFirst({
        where: { id: input.quoteId, workspaceId, clientId: input.clientId },
      }))
    )
      throw new BadRequestException(
        "O orçamento deve pertencer ao cliente selecionado.",
      );
    return client;
  }
  async create(
    workspaceId: string,
    actorUserId: string,
    role: string,
    input: AuthoredDocumentInput,
  ) {
    await this.validate(workspaceId, role, input);
    return prisma.$transaction(async (tx) => {
      const row = await tx.authoredDocument.create({
        data: {
          workspaceId,
          createdById: actorUserId,
          ...input,
          quoteId: input.quoteId || null,
          sections: input.sections as Prisma.InputJsonValue,
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId,
          actorUserId,
          action: "document.authored_created",
          entityType: "AUTHORED_DOCUMENT",
          entityId: row.id,
          afterJson: JSON.stringify({ kind: row.kind, title: row.title }),
          severity: "INFO",
        },
      });
      const { frozenHtml, ...safe } = row;
      return safe;
    });
  }
  async update(
    workspaceId: string,
    id: string,
    actorUserId: string,
    role: string,
    input: AuthoredDocumentInput,
    revision: number,
  ) {
    const current = await this.get(workspaceId, id, role);
    if (current.kind !== input.kind)
      throw new BadRequestException(
        "O tipo do documento não pode ser alterado.",
      );
    await this.validate(workspaceId, role, input);
    return prisma.$transaction(async (tx) => {
      const updated = await tx.authoredDocument.updateMany({
        where: { id, workspaceId, revision, status: "DRAFT" },
        data: {
          ...input,
          quoteId: input.quoteId || null,
          sections: input.sections as Prisma.InputJsonValue,
          revision: { increment: 1 },
        },
      });
      if (!updated.count)
        throw new ConflictException(
          "O documento foi alterado ou finalizado. Recarregue antes de continuar.",
        );
      await tx.auditLog.create({
        data: {
          workspaceId,
          actorUserId,
          action: "document.authored_updated",
          entityType: "AUTHORED_DOCUMENT",
          entityId: id,
          afterJson: JSON.stringify({ revision: revision + 1 }),
          severity: "INFO",
        },
      });
      const row = await tx.authoredDocument.findUniqueOrThrow({
        where: { id },
      });
      const { frozenHtml, ...safe } = row;
      return safe;
    });
  }
  async preview(
    workspaceId: string,
    role: string,
    input: AuthoredDocumentInput,
    number = "PRÉVIA",
    status = "DRAFT",
  ) {
    const client = await this.validate(workspaceId, role, input);
    const [active, ws] = await Promise.all([
      this.visuals.active(workspaceId),
      prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } }),
    ]);
    const config = (active.config ||
      (await this.visuals.defaults(workspaceId))) as VisualConfig;
    const logo = await this.visuals.image(
      workspaceId,
      config.assets.logoLight,
      ws.logoFileObjectId,
    );
    const quote = input.quoteId
      ? await prisma.quote.findFirst({
          where: { id: input.quoteId, workspaceId, clientId: input.clientId },
          include: { items: { orderBy: { sortOrder: "asc" } } },
        })
      : null;
    const money = (value: unknown) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(value));
    return renderEditorialDocument({
      kind: input.kind,
      title: input.title,
      number,
      project: input.project,
      date: new Intl.DateTimeFormat("pt-BR", { timeZone: ws.timeZone }).format(
        new Date(),
      ),
      status,
      company: {
        name: config.name,
        logo,
        email: ws.companyEmail,
        website: ws.companyWebsite,
      },
      client: client.tradeName || client.legalName,
      sections: input.sections,
      visual: documentVisualConfig(config),
      quote: quote
        ? {
            number: quote.number,
            total: money(quote.totalAmount),
            items: quote.items.map((i) => ({
              description: i.description,
              quantity: i.quantity.toString(),
              total: money(i.totalPrice),
            })),
          }
        : null,
    });
  }
  async render(workspaceId: string, id: string, role: string) {
    const row = await prisma.authoredDocument.findFirst({
      where: { id, workspaceId },
    });
    if (!row) throw new NotFoundException("Documento não encontrado.");
    this.allowed(row.kind, role);
    if (row.status === "FINAL" && row.frozenHtml) return row.frozenHtml;
    return this.preview(
      workspaceId,
      role,
      row as unknown as AuthoredDocumentInput,
      `${row.kind === "REPORT" ? "RT" : "PC"}-${row.id.slice(0, 8).toUpperCase()}`,
    );
  }
  async finalize(
    workspaceId: string,
    id: string,
    actorUserId: string,
    role: string,
    revision: number,
  ) {
    const row = await this.get(workspaceId, id, role);
    const html = await this.preview(
      workspaceId,
      role,
      row as unknown as AuthoredDocumentInput,
      `${row.kind === "REPORT" ? "RT" : "PC"}-${row.id.slice(0, 8).toUpperCase()}`,
      "FINAL",
    );
    return prisma.$transaction(async (tx) => {
      const updated = await tx.authoredDocument.updateMany({
        where: { id, workspaceId, revision, status: "DRAFT" },
        data: { status: "FINAL", frozenHtml: html, revision: { increment: 1 } },
      });
      if (!updated.count)
        throw new ConflictException(
          "O documento foi alterado ou já está finalizado. Recarregue antes de continuar.",
        );
      await tx.auditLog.create({
        data: {
          workspaceId,
          actorUserId,
          action: "document.authored_finalized",
          entityType: "AUTHORED_DOCUMENT",
          entityId: id,
          afterJson: JSON.stringify({ revision: revision + 1 }),
          severity: "INFO",
        },
      });
      return { status: "FINAL", revision: revision + 1 };
    });
  }
}

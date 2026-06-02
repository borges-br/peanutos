import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { prisma } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { ContractsQuotaService } from "../contracts/contracts-quota.service";
import {
  ClientUserCreateInput,
  ClientUserUpdateInput,
} from "@peanut/validators";

@Injectable()
export class ClientUsersService {
  constructor(
    private readonly auditService: AuditService,
    private readonly contractsQuotaService: ContractsQuotaService,
  ) {}

  private async validateClientBelongsToWorkspace(
    clientId: string,
    workspaceId: string,
  ) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId },
    });
    if (!client) {
      throw new NotFoundException("Cliente não encontrado neste workspace");
    }
    return client;
  }

  private parseCsvLine(line: string, delimiter: string) {
    const values: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && insideQuotes && next === '"') {
        current += '"';
        i++;
        continue;
      }

      if (char === '"') {
        insideQuotes = !insideQuotes;
        continue;
      }

      if (char === delimiter && !insideQuotes) {
        values.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  }

  private parseCsv(csvText: string) {
    const normalized = csvText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      throw new BadRequestException("CSV sem dados para importar.");
    }

    const firstLine = lines[0] || "";
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
    const headers = this.parseCsvLine(firstLine, delimiter).map((header) => header.trim());

    return lines.slice(1).map((line, index) => {
      const values = this.parseCsvLine(line, delimiter);
      const row: Record<string, string> = {};
      headers.forEach((header, headerIndex) => {
        row[header] = values[headerIndex]?.trim() || "";
      });
      return { row, lineNumber: index + 2 };
    });
  }

  private getCsvValue(row: Record<string, string>, keys: string[]) {
    const normalizedMap = new Map<string, string>();
    for (const [key, value] of Object.entries(row)) {
      normalizedMap.set(key.toLowerCase().replace(/\s+/g, ""), value);
    }

    for (const key of keys) {
      const value = normalizedMap.get(key.toLowerCase().replace(/\s+/g, ""));
      if (value) return value.trim();
    }
    return "";
  }

  private isTrueish(value: string) {
    return ["true", "1", "sim", "yes", "ativo", "enabled"].includes(value.trim().toLowerCase());
  }

  private isFalseish(value: string) {
    return ["false", "0", "nao", "não", "no", "inativo", "disabled"].includes(value.trim().toLowerCase());
  }

  private normalizeEmail(value: string) {
    const email = value.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
  }

  private mapAdRowToClientUser(row: Record<string, string>) {
    const fullName =
      this.getCsvValue(row, ["DisplayName", "NomeExibicao", "NomeExibição"]) ||
      this.getCsvValue(row, ["Name", "Nome"]) ||
      [
        this.getCsvValue(row, ["GivenName", "PrimeiroNome"]),
        this.getCsvValue(row, ["Surname", "Sobrenome"]),
      ].filter(Boolean).join(" ");

    const email = this.normalizeEmail(
      this.getCsvValue(row, ["EmailAddress", "Email", "Mail"]) ||
      this.getCsvValue(row, ["UserPrincipalName"]),
    );
    const enabled = this.getCsvValue(row, ["Enabled", "Ativo"]);
    const description = this.getCsvValue(row, ["Description", "Descricao", "Descrição"]);
    const lockedOut = this.getCsvValue(row, ["LockedOut", "Bloqueado"]);
    const status =
      description.toLowerCase().includes("desligado") || description.toLowerCase().includes("terminated")
        ? "TERMINATED"
        : this.isFalseish(enabled)
          ? "INACTIVE"
          : this.isTrueish(lockedOut)
            ? "PENDING_REVIEW"
            : "ACTIVE";

    const samAccountName = this.getCsvValue(row, ["SamAccountName", "UsuarioSamAccountName", "UsuárioSamAccountName"]);
    const userPrincipalName = this.getCsvValue(row, ["UserPrincipalName"]);
    const notesParts = [
      samAccountName ? `AD SamAccountName: ${samAccountName}` : null,
      userPrincipalName ? `UPN: ${userPrincipalName}` : null,
      this.getCsvValue(row, ["Manager", "Gerente"]) ? `Gerente: ${this.getCsvValue(row, ["Manager", "Gerente"])}` : null,
      this.getCsvValue(row, ["Office", "Escritorio", "Escritório"]) ? `Escritorio: ${this.getCsvValue(row, ["Office", "Escritorio", "Escritório"])}` : null,
      this.getCsvValue(row, ["Company", "Empresa"]) ? `Empresa: ${this.getCsvValue(row, ["Company", "Empresa"])}` : null,
      this.getCsvValue(row, ["LastLogonDate", "UltimoLogonReplicado"]) ? `Ultimo logon: ${this.getCsvValue(row, ["LastLogonDate", "UltimoLogonReplicado"])}` : null,
      this.getCsvValue(row, ["PasswordLastSet", "UltimaAlteracaoSenha"]) ? `Senha alterada em: ${this.getCsvValue(row, ["PasswordLastSet", "UltimaAlteracaoSenha"])}` : null,
      description ? `Descricao AD: ${description}` : null,
    ].filter(Boolean);

    return {
      fullName: fullName.trim(),
      email,
      phone: this.getCsvValue(row, ["MobilePhone", "Mobile", "Celular", "TelephoneNumber", "TelefoneEscritorio", "TelefoneEscritório"]),
      department: this.getCsvValue(row, ["Department", "Departamento"]),
      jobTitle: this.getCsvValue(row, ["Title", "Cargo"]),
      status,
      notes: notesParts.join("\n"),
      samAccountName,
    };
  }

  async list(
    workspaceId: string,
    clientId: string,
    query: { page?: number; limit?: number; search?: string; status?: string },
  ) {
    await this.validateClientBelongsToWorkspace(clientId, workspaceId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(1000, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      workspaceId,
      clientId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { department: { contains: query.search, mode: "insensitive" } },
        { jobTitle: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.clientUser.count({ where }),
      prisma.clientUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: "asc" },
        include: {
          assets: {
            select: { id: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((item) => ({
        ...item,
        assetsCount: item.assets.length,
        assets: undefined, // Omit raw assets list to keep payload clean
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getById(workspaceId: string, clientId: string, id: string) {
    await this.validateClientBelongsToWorkspace(clientId, workspaceId);

    const user = await prisma.clientUser.findFirst({
      where: { id, clientId, workspaceId },
      include: {
        assets: true,
      },
    });

    if (!user) {
      throw new NotFoundException("Usuário do cliente não encontrado");
    }

    return user;
  }

  async create(
    workspaceId: string,
    clientId: string,
    input: ClientUserCreateInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClientBelongsToWorkspace(clientId, workspaceId);

    // If email is filled, verify unique within client or workspace
    if (input.email) {
      const existing = await prisma.clientUser.findFirst({
        where: { workspaceId, clientId, email: input.email },
      });
      if (existing) {
        throw new BadRequestException(
          "Já existe um usuário cadastrado com este e-mail para este cliente",
        );
      }
    }

    // Verify quota
    if (input.status === "ACTIVE" || !input.status) {
      await this.contractsQuotaService.validateUserQuota(
        workspaceId,
        clientId,
        actorUserId,
        ipAddress,
        userAgent,
      );
    }

    const newUser = await prisma.clientUser.create({
      data: {
        workspaceId,
        clientId,
        fullName: input.fullName,
        email: input.email || "",
        phone: input.phone || null,
        department: input.department || null,
        jobTitle: input.jobTitle || null,
        status: input.status || "ACTIVE",
        notes: input.notes || null,
      },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "client_user.created",
      entityType: "CLIENT_USER",
      entityId: newUser.id,
      after: newUser,
      ipAddress,
      userAgent,
    });

    return newUser;
  }

  async importCsv(
    workspaceId: string,
    clientId: string,
    csvText: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClientBelongsToWorkspace(clientId, workspaceId);

    if (!csvText || csvText.length > 5 * 1024 * 1024) {
      throw new BadRequestException("CSV vazio ou acima do limite de 5 MB.");
    }

    const parsedRows = this.parseCsv(csvText);
    const summary = {
      totalRows: parsedRows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ line: number; message: string }>,
    };

    for (const { row, lineNumber } of parsedRows) {
      const mapped = this.mapAdRowToClientUser(row);
      if (!mapped.fullName || mapped.fullName.length < 2) {
        summary.skipped++;
        summary.errors.push({ line: lineNumber, message: "Nome ausente ou inválido." });
        continue;
      }

      try {
        const existing = await prisma.clientUser.findFirst({
          where: {
            workspaceId,
            clientId,
            OR: [
              ...(mapped.email ? [{ email: mapped.email }] : []),
              { fullName: { equals: mapped.fullName, mode: "insensitive" } },
            ],
          },
        });

        if (!existing && mapped.status === "ACTIVE") {
          await this.contractsQuotaService.validateUserQuota(
            workspaceId,
            clientId,
            actorUserId,
            ipAddress,
            userAgent,
          );
        }

        const data = {
          fullName: mapped.fullName,
          email: mapped.email || "",
          phone: mapped.phone || null,
          department: mapped.department || null,
          jobTitle: mapped.jobTitle || null,
          status: mapped.status,
          notes: mapped.notes || null,
        };

        if (existing) {
          await prisma.clientUser.update({
            where: { id: existing.id },
            data,
          });
          summary.updated++;
        } else {
          await prisma.clientUser.create({
            data: {
              workspaceId,
              clientId,
              ...data,
            },
          });
          summary.created++;
        }
      } catch (err: any) {
        summary.skipped++;
        summary.errors.push({
          line: lineNumber,
          message: err.message || "Falha ao importar linha.",
        });
      }
    }

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "client_user.imported",
      entityType: "CLIENT_USER",
      entityId: clientId,
      after: summary,
      ipAddress,
      userAgent,
    });

    return summary;
  }

  async update(
    workspaceId: string,
    clientId: string,
    id: string,
    input: ClientUserUpdateInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClientBelongsToWorkspace(clientId, workspaceId);

    const user = await prisma.clientUser.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!user) {
      throw new NotFoundException("Usuário do cliente não encontrado");
    }

    const before = { ...user };

    if (input.email && input.email !== user.email) {
      const existing = await prisma.clientUser.findFirst({
        where: { workspaceId, clientId, email: input.email, id: { not: id } },
      });
      if (existing) {
        throw new BadRequestException(
          "Já existe um usuário cadastrado com este e-mail para este cliente",
        );
      }
    }

    const data: any = {};
    if (input.fullName !== undefined) data.fullName = input.fullName;
    if (input.email !== undefined) data.email = input.email || "";
    if (input.phone !== undefined) data.phone = input.phone || null;
    if (input.department !== undefined)
      data.department = input.department || null;
    if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle || null;
    if (input.status !== undefined) data.status = input.status;
    if (input.notes !== undefined) data.notes = input.notes || null;

    // Verify quota if reactivating
    if (input.status === "ACTIVE" && user.status !== "ACTIVE") {
      await this.contractsQuotaService.validateUserQuota(
        workspaceId,
        clientId,
        actorUserId,
        ipAddress,
        userAgent,
      );
    }

    const updatedUser = await prisma.clientUser.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "client_user.updated",
      entityType: "CLIENT_USER",
      entityId: id,
      before,
      after: updatedUser,
      ipAddress,
      userAgent,
    });

    return updatedUser;
  }

  async updateStatus(
    workspaceId: string,
    clientId: string,
    id: string,
    status: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClientBelongsToWorkspace(clientId, workspaceId);

    const user = await prisma.clientUser.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!user) {
      throw new NotFoundException("Usuário do cliente não encontrado");
    }

    const before = { ...user };

    // Verify quota if reactivating
    if (status === "ACTIVE" && user.status !== "ACTIVE") {
      await this.contractsQuotaService.validateUserQuota(
        workspaceId,
        clientId,
        actorUserId,
        ipAddress,
        userAgent,
      );
    }

    const updatedUser = await prisma.clientUser.update({
      where: { id },
      data: { status },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "client_user.status_changed",
      entityType: "CLIENT_USER",
      entityId: id,
      before,
      after: updatedUser,
      ipAddress,
      userAgent,
    });

    return updatedUser;
  }
}

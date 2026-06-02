import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { prisma, AssetType, AssetStatus } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { AssetCreateInput, AssetUpdateInput } from "@peanut/validators";
import { encryptSensitiveData, decryptSensitiveData } from "@peanut/utils";
import { ContractsQuotaService } from "../contracts/contracts-quota.service";

const QUOTA_COUNTED_ASSET_STATUSES = [
  "OPERATIONAL",
  "IN_MAINTENANCE",
  "OUT_OF_STANDARD",
  "IN_STOCK",
  "PENDING_REVIEW",
] as const;

@Injectable()
export class InventoryService {
  constructor(
    private readonly auditService: AuditService,
    private readonly contractsQuotaService: ContractsQuotaService,
  ) {}

  private async validateClient(clientId: string, workspaceId: string) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId },
    });
    if (!client) {
      throw new NotFoundException("Cliente não encontrado neste workspace");
    }
    return client;
  }

  private isQuotaCountedStatus(status: string): boolean {
    return QUOTA_COUNTED_ASSET_STATUSES.includes(
      status as (typeof QUOTA_COUNTED_ASSET_STATUSES)[number],
    );
  }

  private async logAssetHistory(params: {
    workspaceId: string;
    clientId: string;
    assetId: string;
    actorUserId: string;
    event: string;
    description: string;
    before?: any;
    after?: any;
  }) {
    // Sanitise before and after to ensure sensitive data is not logged in asset history
    const sanitizeData = (data: any) => {
      if (!data) return null;
      const copy = { ...data };
      if (copy.sensitiveDataEncrypted)
        copy.sensitiveDataEncrypted = "[REDACTED]";
      if (copy.sensitiveData) copy.sensitiveData = "[REDACTED]";
      return JSON.stringify(copy);
    };

    await prisma.assetHistory.create({
      data: {
        workspaceId: params.workspaceId,
        clientId: params.clientId,
        assetId: params.assetId,
        actorUserId: params.actorUserId,
        event: params.event,
        description: params.description,
        before: sanitizeData(params.before),
        after: sanitizeData(params.after),
      },
    });
  }

  private normalizeCsvKey(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  private parseCsv(csvText: string) {
    const normalized = csvText
      .replace(/^\uFEFF/, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    if (!normalized.trim()) {
      throw new BadRequestException("CSV vazio.");
    }

    const firstLine = normalized.split("\n")[0] || "";
    const delimiter =
      (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length
        ? ";"
        : ",";

    const rows: Array<{ values: string[]; lineNumber: number }> = [];
    let values: string[] = [];
    let current = "";
    let insideQuotes = false;
    let lineNumber = 1;
    let rowStartLine = 1;

    const pushValue = () => {
      values.push(current.trim());
      current = "";
    };

    const pushRow = () => {
      if (values.some((value) => value.trim())) {
        rows.push({ values, lineNumber: rowStartLine });
      }
      values = [];
    };

    for (let index = 0; index < normalized.length; index++) {
      const char = normalized[index];
      const next = normalized[index + 1];

      if (char === '"' && insideQuotes && next === '"') {
        current += '"';
        index++;
        continue;
      }

      if (char === '"') {
        insideQuotes = !insideQuotes;
        continue;
      }

      if (char === delimiter && !insideQuotes) {
        pushValue();
        continue;
      }

      if (char === "\n") {
        if (insideQuotes) {
          current += char;
          lineNumber++;
          continue;
        }

        pushValue();
        pushRow();
        lineNumber++;
        rowStartLine = lineNumber;
        continue;
      }

      current += char;
    }

    if (current || values.length) {
      pushValue();
      pushRow();
    }

    if (rows.length < 2) {
      throw new BadRequestException("CSV sem dados para importar.");
    }

    const headerRow = rows[0];
    if (!headerRow) {
      throw new BadRequestException("CSV sem cabecalho.");
    }

    const headers = headerRow.values.map((header) => header.trim());
    return rows.slice(1).map(({ values: rowValues, lineNumber: rowLine }) => {
      const row: Record<string, string> = {};
      headers.forEach((header, headerIndex) => {
        row[header] = rowValues[headerIndex]?.trim() || "";
      });
      return { row, lineNumber: rowLine };
    });
  }

  private getCsvValue(row: Record<string, string>, keys: string[]) {
    const normalizedMap = new Map<string, string>();
    for (const [key, value] of Object.entries(row)) {
      normalizedMap.set(this.normalizeCsvKey(key), value);
    }

    for (const key of keys) {
      const value = normalizedMap.get(this.normalizeCsvKey(key));
      if (value?.trim()) return value.trim();
    }

    return "";
  }

  private isTrueish(value: string) {
    return ["true", "1", "sim", "yes", "online", "running", "enabled"].includes(
      value.trim().toLowerCase(),
    );
  }

  private isFalseish(value: string) {
    return [
      "false",
      "0",
      "nao",
      "não",
      "no",
      "offline",
      "off",
      "disabled",
      "stopped",
    ].includes(value.trim().toLowerCase());
  }

  private truncate(value: string, max: number) {
    const trimmed = value.trim();
    return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
  }

  private isUsefulIdentifier(value: string | null | undefined) {
    const normalized = (value || "").trim().toLowerCase();
    return Boolean(
      normalized &&
        !["-", "--", "0", "n/a", "na", "none", "null", "unknown", "desconhecido"].includes(
          normalized,
        ),
    );
  }

  private pickFirstListValue(value: string) {
    return (
      value
        .split(/[;,\n]/)
        .map((item) => item.trim())
        .find(Boolean) || ""
    );
  }

  private mapAssetType(typeValue: string, operatingSystem: string): AssetType {
    const text = `${typeValue} ${operatingSystem}`.toLowerCase();
    if (text.includes("hyper-v") || text.includes("vm ") || text.includes("virtual")) {
      return "VIRTUAL_MACHINE";
    }
    if (text.includes("server") || text.includes("servidor")) return "SERVER";
    if (text.includes("notebook") || text.includes("laptop")) return "NOTEBOOK";
    if (text.includes("printer") || text.includes("impressora")) return "PRINTER";
    if (text.includes("switch")) return "SWITCH";
    if (text.includes("router") || text.includes("roteador")) return "ROUTER";
    if (text.includes("firewall")) return "FIREWALL";
    if (text.includes("nas")) return "NAS";
    if (text.includes("storage")) return "STORAGE";
    if (text.includes("mobile") || text.includes("celular")) return "MOBILE_DEVICE";
    if (text.includes("estacao") || text.includes("estação") || text.includes("workstation")) {
      return "WORKSTATION";
    }
    return "OTHER";
  }

  private mapAssetStatus(row: Record<string, string>): AssetStatus {
    const enabledAd = this.getCsvValue(row, ["EnabledAD", "Enabled"]);
    const online = this.getCsvValue(row, ["Online"]);
    const vmState = this.getCsvValue(row, ["VMState"]);

    if (enabledAd && this.isFalseish(enabledAd)) return "RETIRED";
    if (vmState && this.isTrueish(vmState)) return "OPERATIONAL";
    if (online && this.isTrueish(online)) return "OPERATIONAL";
    if ((online && this.isFalseish(online)) || (vmState && this.isFalseish(vmState))) {
      return "PENDING_VALIDATION";
    }
    return "PENDING_VALIDATION";
  }

  private buildImportedNotes(row: Record<string, string>) {
    const parts = [
      this.getCsvValue(row, ["ChaveInventario"]) &&
        `Chave inventario: ${this.getCsvValue(row, ["ChaveInventario"])}`,
      this.getCsvValue(row, ["Origem"]) && `Origem: ${this.getCsvValue(row, ["Origem"])}`,
      this.getCsvValue(row, ["Dominio"]) && `Dominio: ${this.getCsvValue(row, ["Dominio"])}`,
      this.getCsvValue(row, ["IPv4_AD"]) && `IPv4 AD: ${this.getCsvValue(row, ["IPv4_AD"])}`,
      this.getCsvValue(row, ["IPsDetectados"]) &&
        `IPs detectados: ${this.getCsvValue(row, ["IPsDetectados"])}`,
      this.getCsvValue(row, ["IPsHyperV"]) && `IPs Hyper-V: ${this.getCsvValue(row, ["IPsHyperV"])}`,
      this.getCsvValue(row, ["MACsHyperV"]) && `MACs Hyper-V: ${this.getCsvValue(row, ["MACsHyperV"])}`,
      this.getCsvValue(row, ["OU"]) && `OU: ${this.getCsvValue(row, ["OU"])}`,
      this.getCsvValue(row, ["CanonicalName"]) &&
        `CanonicalName: ${this.getCsvValue(row, ["CanonicalName"])}`,
      this.getCsvValue(row, ["DistinguishedName"]) &&
        `DistinguishedName: ${this.getCsvValue(row, ["DistinguishedName"])}`,
      this.getCsvValue(row, ["DescricaoAD", "DescriçãoAD"]) &&
        `Descricao AD: ${this.getCsvValue(row, ["DescricaoAD", "DescriçãoAD"])}`,
      this.getCsvValue(row, ["LocalizacaoAD", "LocalizaçãoAD"]) &&
        `Localizacao AD: ${this.getCsvValue(row, ["LocalizacaoAD", "LocalizaçãoAD"])}`,
      this.getCsvValue(row, ["ManagedBy"]) && `ManagedBy: ${this.getCsvValue(row, ["ManagedBy"])}`,
      this.getCsvValue(row, ["LastLogonDate"]) &&
        `Ultimo logon: ${this.getCsvValue(row, ["LastLogonDate"])}`,
      this.getCsvValue(row, ["PasswordLastSet"]) &&
        `Senha alterada em: ${this.getCsvValue(row, ["PasswordLastSet"])}`,
      this.getCsvValue(row, ["HyperVHost"]) &&
        `Hyper-V host: ${this.getCsvValue(row, ["HyperVHost"])}`,
      this.getCsvValue(row, ["VMState"]) && `VM state: ${this.getCsvValue(row, ["VMState"])}`,
      this.getCsvValue(row, ["VMSwitches"]) &&
        `VM switches: ${this.getCsvValue(row, ["VMSwitches"])}`,
      this.getCsvValue(row, ["VMPath"]) && `VM path: ${this.getCsvValue(row, ["VMPath"])}`,
      this.getCsvValue(row, ["CIMStatus"]) && `CIM status: ${this.getCsvValue(row, ["CIMStatus"])}`,
      this.getCsvValue(row, ["Observacoes", "Observações"]) &&
        `Observacoes: ${this.getCsvValue(row, ["Observacoes", "Observações"])}`,
    ].filter(Boolean);

    return parts.join("\n");
  }

  private mergeImportedNotes(existingNotes: string | null, importedNotes: string) {
    const marker = "--- Dados importados do CSV de inventario ---";
    const [baseNotes = ""] = (existingNotes || "").split(marker);
    const base = baseNotes.trim();
    const importBlock = importedNotes ? `${marker}\n${importedNotes}` : "";
    return [base, importBlock].filter(Boolean).join("\n\n") || null;
  }

  private mapCsvRowToAsset(row: Record<string, string>) {
    const name =
      this.getCsvValue(row, ["Nome"]) ||
      this.getCsvValue(row, ["NomeDNS"]) ||
      this.getCsvValue(row, ["ChaveInventario"]);
    const dnsName = this.getCsvValue(row, ["NomeDNS"]);
    const hostname = dnsName || name;
    const operatingSystem =
      this.getCsvValue(row, ["SistemaOperacionalCIM"]) ||
      this.getCsvValue(row, ["SistemaOperacionalAD"]);
    const serialNumber = this.getCsvValue(row, ["Serial"]);
    const assetTag = this.getCsvValue(row, ["ChaveInventario"]);
    const macAddress =
      this.pickFirstListValue(this.getCsvValue(row, ["MACsHyperV"])) ||
      this.pickFirstListValue(this.getCsvValue(row, ["MACAddress", "MacAddress"]));

    return {
      name: this.truncate(name, 150),
      hostname: this.truncate(hostname, 100),
      type: this.mapAssetType(this.getCsvValue(row, ["TipoProvavel"]), operatingSystem),
      status: this.mapAssetStatus(row),
      manufacturer: this.truncate(this.getCsvValue(row, ["Fabricante"]), 100),
      model: this.truncate(this.getCsvValue(row, ["Modelo"]), 100),
      serialNumber: this.truncate(serialNumber, 100),
      assetTag: this.truncate(assetTag, 50),
      macAddress: this.truncate(macAddress, 50),
      operatingSystem: this.truncate(operatingSystem, 100),
      location: this.truncate(
        this.getCsvValue(row, ["LocalizacaoAD", "LocalizaçãoAD"]) ||
          this.getCsvValue(row, ["OU"]),
        100,
      ),
      notes: this.buildImportedNotes(row),
    };
  }

  async listGlobal(
    workspaceId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      type?: string;
      clientId?: string;
    },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(1000, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      workspaceId,
    };

    if (query.clientId) {
      where.clientId = query.clientId;
    }
    if (query.status) {
      where.status = query.status as AssetStatus;
    }
    if (query.type) {
      where.type = query.type as AssetType;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { hostname: { contains: query.search, mode: "insensitive" } },
        { serialNumber: { contains: query.search, mode: "insensitive" } },
        { assetTag: { contains: query.search, mode: "insensitive" } },
        { location: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: { id: true, legalName: true, tradeName: true },
          },
          assignedClientUser: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async listByClient(
    workspaceId: string,
    clientId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      type?: string;
    },
  ) {
    await this.validateClient(clientId, workspaceId);
    return this.listGlobal(workspaceId, { ...query, clientId });
  }

  async getById(workspaceId: string, clientId: string, id: string) {
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
      include: {
        client: true,
        assignedClientUser: true,
        assetNotes: {
          orderBy: { createdAt: "desc" },
          include: {
            authorUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        history: {
          orderBy: { createdAt: "desc" },
          include: {
            actorUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    return asset;
  }

  async importCsv(
    workspaceId: string,
    clientId: string,
    csvText: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClient(clientId, workspaceId);

    if (!csvText || csvText.length > 10 * 1024 * 1024) {
      throw new BadRequestException("CSV vazio ou acima do limite de 10 MB.");
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
      const mapped = this.mapCsvRowToAsset(row);

      if (!mapped.name || mapped.name.length < 2) {
        summary.skipped++;
        summary.errors.push({
          line: lineNumber,
          message: "Nome do ativo ausente ou invalido.",
        });
        continue;
      }

      try {
        const matchConditions: any[] = [];
        if (this.isUsefulIdentifier(mapped.serialNumber)) {
          matchConditions.push({ serialNumber: mapped.serialNumber });
        }
        if (this.isUsefulIdentifier(mapped.hostname)) {
          matchConditions.push({ hostname: { equals: mapped.hostname, mode: "insensitive" } });
        }
        if (this.isUsefulIdentifier(mapped.assetTag)) {
          matchConditions.push({ assetTag: mapped.assetTag });
        }
        if (matchConditions.length === 0) {
          matchConditions.push({ name: { equals: mapped.name, mode: "insensitive" } });
        }

        const existing = await prisma.asset.findFirst({
          where: {
            workspaceId,
            clientId,
            OR: matchConditions,
          },
        });

        if (
          (!existing && this.isQuotaCountedStatus(mapped.status)) ||
          (existing &&
            this.isQuotaCountedStatus(mapped.status) &&
            !this.isQuotaCountedStatus(existing.status))
        ) {
          await this.contractsQuotaService.validateAssetQuota(
            workspaceId,
            clientId,
            actorUserId,
            ipAddress,
            userAgent,
          );
        }

        const data = {
          name: mapped.name,
          hostname: mapped.hostname || null,
          type: mapped.type,
          status: mapped.status,
          manufacturer: mapped.manufacturer || null,
          model: mapped.model || null,
          serialNumber: mapped.serialNumber || null,
          assetTag: mapped.assetTag || null,
          macAddress: mapped.macAddress || null,
          operatingSystem: mapped.operatingSystem || null,
          location: mapped.location || null,
          notes: this.mergeImportedNotes(existing?.notes || null, mapped.notes),
        };

        if (existing) {
          const updated = await prisma.asset.update({
            where: { id: existing.id },
            data,
          });

          await this.logAssetHistory({
            workspaceId,
            clientId,
            assetId: updated.id,
            actorUserId,
            event: "ASSET_IMPORTED_UPDATED",
            description: `Ativo atualizado por importacao CSV: ${updated.name}`,
            before: existing,
            after: updated,
          });

          summary.updated++;
        } else {
          const created = await prisma.asset.create({
            data: {
              workspaceId,
              clientId,
              ...data,
            },
          });

          await this.logAssetHistory({
            workspaceId,
            clientId,
            assetId: created.id,
            actorUserId,
            event: "ASSET_IMPORTED",
            description: `Ativo criado por importacao CSV: ${created.name}`,
            after: created,
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
      action: "asset.imported",
      entityType: "ASSET",
      entityId: clientId,
      after: summary,
      ipAddress,
      userAgent,
    });

    return summary;
  }

  async create(
    workspaceId: string,
    clientId: string,
    input: AssetCreateInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClient(clientId, workspaceId);

    // If clientUserId is provided, check if it exists and belongs to the client
    if (input.assignedClientUserId) {
      const clientUser = await prisma.clientUser.findFirst({
        where: { id: input.assignedClientUserId, clientId, workspaceId },
      });
      if (!clientUser) {
        throw new NotFoundException("Usuário do cliente não encontrado");
      }
    }

    // Encrypt sensitive data if provided
    let sensitiveDataEncrypted: string | null = null;
    if (input.sensitiveDataEncrypted) {
      sensitiveDataEncrypted = encryptSensitiveData(
        input.sensitiveDataEncrypted,
      );
    }

    // Verify asset quota
    const isNewActive = this.isQuotaCountedStatus(input.status);
    if (isNewActive) {
      await this.contractsQuotaService.validateAssetQuota(
        workspaceId,
        clientId,
        actorUserId,
        ipAddress,
        userAgent,
      );
    }

    const newAsset = await prisma.asset.create({
      data: {
        workspaceId,
        clientId,
        assignedClientUserId: input.assignedClientUserId || null,
        name: input.name,
        hostname: input.hostname || null,
        type: input.type as AssetType,
        status: input.status as AssetStatus,
        manufacturer: input.manufacturer || null,
        model: input.model || null,
        serialNumber: input.serialNumber || null,
        assetTag: input.assetTag || null,
        macAddress: input.macAddress || null,
        operatingSystem: input.operatingSystem || null,
        location: input.location || null,
        remoteAccessId: input.remoteAccessId || null,
        sensitiveDataEncrypted,
        notes: input.notes || null,
      },
    });

    // Write history
    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: newAsset.id,
      actorUserId,
      event: "ASSET_CREATED",
      description: `Ativo criado: ${newAsset.name} (${newAsset.type})`,
      after: newAsset,
    });

    // Write audit
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "asset.created",
      entityType: "ASSET",
      entityId: newAsset.id,
      after: newAsset,
      ipAddress,
      userAgent,
    });

    return newAsset;
  }

  async update(
    workspaceId: string,
    clientId: string,
    id: string,
    input: AssetUpdateInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    const before = { ...asset };

    // If clientUserId is provided, check if it exists
    if (input.assignedClientUserId) {
      const clientUser = await prisma.clientUser.findFirst({
        where: { id: input.assignedClientUserId, clientId, workspaceId },
      });
      if (!clientUser) {
        throw new NotFoundException("Usuário do cliente não encontrado");
      }
    }

    const data: any = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.hostname !== undefined) data.hostname = input.hostname || null;
    if (input.type !== undefined) data.type = input.type as AssetType;
    if (input.status !== undefined) data.status = input.status as AssetStatus;
    if (input.manufacturer !== undefined)
      data.manufacturer = input.manufacturer || null;
    if (input.model !== undefined) data.model = input.model || null;
    if (input.serialNumber !== undefined)
      data.serialNumber = input.serialNumber || null;
    if (input.assetTag !== undefined) data.assetTag = input.assetTag || null;
    if (input.macAddress !== undefined)
      data.macAddress = input.macAddress || null;
    if (input.operatingSystem !== undefined)
      data.operatingSystem = input.operatingSystem || null;
    if (input.location !== undefined) data.location = input.location || null;
    if (input.remoteAccessId !== undefined)
      data.remoteAccessId = input.remoteAccessId || null;
    if (input.notes !== undefined) data.notes = input.notes || null;
    if (input.assignedClientUserId !== undefined)
      data.assignedClientUserId = input.assignedClientUserId;

    // Encrypt sensitive data if provided
    let isSensitiveUpdated = false;
    if (input.sensitiveDataEncrypted !== undefined) {
      data.sensitiveDataEncrypted = input.sensitiveDataEncrypted
        ? encryptSensitiveData(input.sensitiveDataEncrypted)
        : null;
      isSensitiveUpdated = true;
    }

    // Verify quota if reactivating asset
    if (input.status !== undefined) {
      const isCurrentlyActive = this.isQuotaCountedStatus(before.status);
      const isNextActive = this.isQuotaCountedStatus(input.status);
      if (isNextActive && !isCurrentlyActive) {
        await this.contractsQuotaService.validateAssetQuota(
          workspaceId,
          clientId,
          actorUserId,
          ipAddress,
          userAgent,
        );
      }
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data,
    });

    // Write history
    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: id,
      actorUserId,
      event: isSensitiveUpdated ? "SENSITIVE_DATA_UPDATED" : "ASSET_UPDATED",
      description: isSensitiveUpdated
        ? "Dados técnicos sensíveis atualizados"
        : "Especificações do ativo atualizadas",
      before,
      after: updatedAsset,
    });

    // Write audit
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: isSensitiveUpdated
        ? "asset.sensitive_data_updated"
        : "asset.updated",
      entityType: "ASSET",
      entityId: id,
      before,
      after: updatedAsset,
      ipAddress,
      userAgent,
    });

    return updatedAsset;
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
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    const before = { ...asset };

    // Verify quota if reactivating status
    const isCurrentlyActive = this.isQuotaCountedStatus(before.status);
    const isNextActive = this.isQuotaCountedStatus(status);
    if (isNextActive && !isCurrentlyActive) {
      await this.contractsQuotaService.validateAssetQuota(
        workspaceId,
        clientId,
        actorUserId,
        ipAddress,
        userAgent,
      );
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: { status: status as AssetStatus },
    });

    // Write history
    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: id,
      actorUserId,
      event: "STATUS_CHANGED",
      description: `Status alterado de ${before.status} para ${status}`,
      before,
      after: updatedAsset,
    });

    // Write audit
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "asset.status_changed",
      entityType: "ASSET",
      entityId: id,
      before,
      after: updatedAsset,
      ipAddress,
      userAgent,
    });

    return updatedAsset;
  }

  async delete(
    workspaceId: string,
    clientId: string,
    id: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    // Perform soft delete by changing status to RETIRED
    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: { status: "RETIRED" },
    });

    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: id,
      actorUserId,
      event: "STATUS_CHANGED",
      description: "Ativo arquivado (desativado)",
      before: asset,
      after: updatedAsset,
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "asset.deleted_or_retired",
      entityType: "ASSET",
      entityId: id,
      before: asset,
      after: updatedAsset,
      ipAddress,
      userAgent,
    });

    return updatedAsset;
  }

  async assign(
    workspaceId: string,
    clientId: string,
    id: string,
    clientUserId: string | null,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    const before = { ...asset };

    let userFullName = "";
    if (clientUserId) {
      const clientUser = await prisma.clientUser.findFirst({
        where: { id: clientUserId, clientId, workspaceId },
      });
      if (!clientUser) {
        throw new NotFoundException("Usuário do cliente não encontrado");
      }
      userFullName = clientUser.fullName;
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: { assignedClientUserId: clientUserId || null },
    });

    // Write history
    const event = clientUserId ? "ASSIGNED" : "UNASSIGNED";
    const description = clientUserId
      ? `Ativo vinculado ao usuário: ${userFullName}`
      : "Ativo desvinculado do usuário";

    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: id,
      actorUserId,
      event,
      description,
      before,
      after: updatedAsset,
    });

    // Write audit
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: clientUserId ? "asset.assigned" : "asset.unassigned",
      entityType: "ASSET",
      entityId: id,
      before,
      after: updatedAsset,
      ipAddress,
      userAgent,
    });

    return updatedAsset;
  }

  async revealSensitiveData(
    workspaceId: string,
    clientId: string,
    id: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    if (!asset.sensitiveDataEncrypted) {
      return { sensitiveData: null };
    }

    let sensitiveData = null;
    try {
      sensitiveData = decryptSensitiveData(asset.sensitiveDataEncrypted);
    } catch (e) {
      throw new BadRequestException(
        "Erro ao descriptografar dados sensíveis. Verifique a chave de criptografia.",
      );
    }

    // Write history (sanitized, only register that reveal happened)
    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: id,
      actorUserId,
      event: "SENSITIVE_DATA_REVEALED",
      description: "Credenciais e dados técnicos sensíveis visualizados",
    });

    // Write audit (sanitized)
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "asset.sensitive_data_revealed",
      entityType: "ASSET",
      entityId: id,
      ipAddress,
      userAgent,
      severity: "SECURITY_ALERT",
    });

    return { sensitiveData };
  }

  async createNote(
    workspaceId: string,
    clientId: string,
    id: string,
    content: string,
    visibility: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    // Blocks basic password/key texts in notes to follow simple sanitisation rules
    const lowerContent = content.toLowerCase();
    const blockedKeywords = [
      "senha",
      "password",
      "token",
      "secret",
      "api_key",
      "apikey",
    ];
    const containsSensitive = blockedKeywords.some((keyword) =>
      lowerContent.includes(keyword),
    );

    if (containsSensitive) {
      throw new BadRequestException(
        "Por motivos de segurança, notas técnicas não devem conter senhas ou tokens em texto puro. Por favor, use o campo de dados sensíveis criptografados.",
      );
    }

    const note = await prisma.assetNote.create({
      data: {
        workspaceId,
        clientId,
        assetId: id,
        authorUserId: actorUserId,
        content,
        visibility,
      },
    });

    // Write history
    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: id,
      actorUserId,
      event: "NOTE_ADDED",
      description: "Nota técnica adicionada",
    });

    // Write audit
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "asset_note.created",
      entityType: "ASSET_NOTE",
      entityId: note.id,
      after: note,
      ipAddress,
      userAgent,
    });

    return note;
  }
}

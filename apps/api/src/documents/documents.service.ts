import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { prisma } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { DocumentQueryInput, DocumentUploadInput } from "@peanut/validators";
import { Queue } from "bullmq";
import {
  S3Client,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import * as crypto from "crypto";

@Injectable()
export class DocumentsService {
  constructor(private readonly auditService: AuditService) {
    this.ensureBucketExists().catch((err) => {
      console.warn(
        "[S3 API Initialize] Auto-create check threw unhandled error:",
        err.message,
      );
    });
  }

  private normalizeS3Endpoint(endpoint?: string) {
    const value = endpoint || "http://localhost:9000";
    return /^https?:\/\//i.test(value) ? value : `http://${value}`;
  }

  private readonly s3Endpoint = this.normalizeS3Endpoint(
    process.env.S3_ENDPOINT,
  );
  private readonly s3AccessKey =
    process.env.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || "minio_admin";
  private readonly s3SecretKey =
    process.env.S3_SECRET_ACCESS_KEY ||
    process.env.S3_SECRET_KEY ||
    "change-me-in-production";
  private readonly s3Bucket =
    process.env.S3_BUCKET ||
    process.env.S3_BUCKET_NAME ||
    "peanut-os-documents";
  private readonly s3Region = process.env.S3_REGION || "us-east-1";
  private readonly s3ForcePathStyle =
    String(process.env.S3_FORCE_PATH_STYLE ?? "true") === "true";

  private readonly s3Client = new S3Client({
    endpoint: this.s3Endpoint,
    region: this.s3Region,
    credentials: {
      accessKeyId: this.s3AccessKey,
      secretAccessKey: this.s3SecretKey,
    },
    forcePathStyle: this.s3ForcePathStyle,
  });

  private async ensureBucketExists() {
    const isProduction = process.env.NODE_ENV === "production";
    const autoCreate = process.env.S3_AUTO_CREATE_BUCKET === "true";

    if (!isProduction && autoCreate) {
      console.log(
        `[S3 API Initialize] Checking bucket "${this.s3Bucket}" existence...`,
      );
      try {
        await this.s3Client.send(
          new HeadBucketCommand({ Bucket: this.s3Bucket }),
        );
        console.log(`[S3 API Initialize] Bucket "${this.s3Bucket}" is ready.`);
      } catch (err: any) {
        if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
          console.log(
            `[S3 API Initialize] Bucket "${this.s3Bucket}" not found. Creating dynamically...`,
          );
          try {
            await this.s3Client.send(
              new CreateBucketCommand({ Bucket: this.s3Bucket }),
            );
            console.log(
              `[S3 API Initialize] Bucket "${this.s3Bucket}" created successfully.`,
            );
          } catch (createErr: any) {
            console.error(
              `[S3 API Initialize] Failed to create bucket "${this.s3Bucket}":`,
              createErr.message,
            );
          }
        } else {
          console.warn(
            `[S3 API Initialize] HeadBucket query failed (safe bypass):`,
            err.message,
          );
        }
      }
    }
  }

  private isUuid(val: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(val);
  }

  private safeFilename(filename: string) {
    return filename.replace(/[^\w.\- ()]/g, "_").slice(0, 180);
  }

  private stripBase64DataUrl(data: string) {
    return data.replace(/^data:[^;]+;base64,/, "");
  }

  private sanitizeDocument(doc: any, role: string) {
    const { fileObject } = doc;
    if (!fileObject) {
      throw new Error(
        `FileObject relationship is missing for document ${doc.id}`,
      );
    }

    let parsedMetadata = null;
    if (doc.metadata) {
      try {
        parsedMetadata = JSON.parse(doc.metadata);
        parsedMetadata = this.auditService.sanitizeForRead(
          parsedMetadata,
          role,
        );
      } catch (e) {
        parsedMetadata = doc.metadata;
      }
    }

    const file: any = {
      id: fileObject.id,
      originalFilename: fileObject.originalFilename,
      mimeType: fileObject.mimeType,
      sizeBytes: fileObject.sizeBytes.toString(),
      visibility: fileObject.visibility,
      createdAt: fileObject.createdAt,
    };

    const sha256 = role === "READ_ONLY" ? undefined : doc.sha256;

    return {
      id: doc.id,
      documentType: doc.documentType,
      entityType: doc.entityType,
      entityId: doc.entityId,
      version: doc.version,
      generatedAt: doc.generatedAt,
      generatedById: doc.generatedById,
      sha256,
      metadata: parsedMetadata,
      file,
    };
  }

  async list(workspaceId: string, query: DocumentQueryInput, role: string) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      workspaceId,
    };

    if (query.documentType) {
      where.documentType = query.documentType;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    if (query.dateFrom || query.dateTo) {
      where.generatedAt = {};
      if (query.dateFrom) {
        where.generatedAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.generatedAt.lte = new Date(query.dateTo);
      }
    }

    const fileObjectConditions: any = {};
    if (query.visibility) {
      fileObjectConditions.visibility = query.visibility;
    }

    if (query.search) {
      const searchPattern = query.search;
      const orConditions: any[] = [
        { entityType: { contains: searchPattern, mode: "insensitive" } },
        {
          fileObject: {
            originalFilename: { contains: searchPattern, mode: "insensitive" },
          },
        },
        {
          fileObject: {
            mimeType: { contains: searchPattern, mode: "insensitive" },
          },
        },
      ];

      // Safe search for exact UUID fields without using contains
      if (this.isUuid(searchPattern)) {
        orConditions.push({ id: { equals: searchPattern } });
        orConditions.push({ entityId: { equals: searchPattern } });
        orConditions.push({ fileObjectId: { equals: searchPattern } });
      }

      where.OR = orConditions;
    }

    if (Object.keys(fileObjectConditions).length > 0) {
      where.fileObject = fileObjectConditions;
    }

    // Main fetch with total count
    const [documents, total] = await Promise.all([
      prisma.generatedDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { generatedAt: "desc" },
        include: {
          fileObject: true,
        },
      }),
      prisma.generatedDocument.count({ where }),
    ]);

    // Summary calculation (Workspace-wide, not filtered by search/query filters)
    const [
      totalDocuments,
      privateDocuments,
      publicDocuments,
      totalSizeBytesResult,
      byTypeGroups,
    ] = await Promise.all([
      prisma.generatedDocument.count({
        where: { workspaceId },
      }),
      prisma.generatedDocument.count({
        where: { workspaceId, fileObject: { visibility: "PRIVATE" } },
      }),
      prisma.generatedDocument.count({
        where: { workspaceId, fileObject: { visibility: "PUBLIC" } },
      }),
      prisma.fileObject.aggregate({
        where: { workspaceId },
        _sum: {
          sizeBytes: true,
        },
      }),
      prisma.generatedDocument.groupBy({
        by: ["documentType"],
        where: { workspaceId },
        _count: {
          _all: true,
        },
      }),
    ]);

    const byType: Record<string, number> = {};
    for (const group of byTypeGroups) {
      byType[group.documentType] = group._count._all;
    }

    // Dynamic distinct filters for sidebar/headers based on workspace
    const [distinctDocumentTypes, distinctEntityTypes, distinctVisibilities] =
      await Promise.all([
        prisma.generatedDocument.groupBy({
          by: ["documentType"],
          where: { workspaceId },
        }),
        prisma.generatedDocument.groupBy({
          by: ["entityType"],
          where: { workspaceId },
        }),
        prisma.fileObject.groupBy({
          by: ["visibility"],
          where: { workspaceId },
        }),
      ]);

    const filters = {
      documentTypes: distinctDocumentTypes.map((x) => x.documentType),
      entityTypes: distinctEntityTypes.map((x) => x.entityType),
      visibilities: distinctVisibilities.map((x) => x.visibility),
    };

    const sanitizedData = documents.map((doc) =>
      this.sanitizeDocument(doc, role),
    );

    return {
      data: sanitizedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalDocuments,
        privateDocuments,
        publicDocuments,
        totalSizeBytes: (totalSizeBytesResult._sum.sizeBytes || 0n).toString(),
        byType,
      },
      filters,
    };
  }

  async getById(
    id: string,
    workspaceId: string,
    role: string,
    actorUserId: string,
  ) {
    const doc = await prisma.generatedDocument.findFirst({
      where: { id, workspaceId },
      include: {
        fileObject: true,
      },
    });

    if (!doc) {
      throw new NotFoundException("Documento não encontrado");
    }

    // Generate permanent audit entry only upon detail view (not listing)
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "document.viewed",
      entityType: "DOCUMENT",
      entityId: id,
      severity: "INFO",
      after: {
        documentId: id,
        documentType: doc.documentType,
        originalFilename: doc.fileObject.originalFilename,
        version: doc.version,
      },
    });

    return this.sanitizeDocument(doc, role);
  }

  async uploadManualDocument(
    input: DocumentUploadInput,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const maxBytes = 25 * 1024 * 1024;
    const allowedMimes = new Set([
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ]);

    if (!allowedMimes.has(input.mimeType)) {
      throw new BadRequestException("Tipo de arquivo não permitido.");
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(this.stripBase64DataUrl(input.data), "base64");
    } catch {
      throw new BadRequestException("Arquivo enviado em Base64 inválido.");
    }

    if (!buffer.length || buffer.length > maxBytes) {
      throw new BadRequestException(
        "Arquivo vazio ou acima do limite de 25 MB.",
      );
    }

    if (input.mimeType === "image/svg+xml") {
      const svg = buffer.toString("utf8");
      const unsafeSvgPattern =
        /<script|on\w+\s*=|<foreignObject|javascript:|data:text\/html/i;
      if (!svg.includes("<svg") || unsafeSvgPattern.test(svg)) {
        throw new BadRequestException("SVG inválido ou potencialmente inseguro.");
      }
    }

    const entityType = input.entityType || "WORKSPACE";
    const entityId = input.entityId || workspaceId;
    await this.validateManualDocumentEntity(entityType, entityId, workspaceId);

    const originalFilename = this.safeFilename(input.filename);
    const ext = originalFilename.includes(".")
      ? originalFilename.split(".").pop()
      : "bin";
    const key = `${workspaceId}/manual-documents/${input.documentType.toLowerCase()}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
          Body: buffer,
          ContentType: input.mimeType,
        }),
      );
    } catch (err: any) {
      console.error("[DocumentsService] Manual upload failed:", err.message);
      throw new BadRequestException("Falha ao salvar arquivo no armazenamento.");
    }

    try {
      const lastDoc = await prisma.generatedDocument.findFirst({
        where: {
          workspaceId,
          entityType,
          entityId,
          documentType: input.documentType,
        },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const version = lastDoc ? lastDoc.version + 1 : 1;

      const fileObject = await prisma.fileObject.create({
        data: {
          workspaceId,
          bucket: this.s3Bucket,
          key,
          originalFilename,
          mimeType: input.mimeType,
          sizeBytes: BigInt(buffer.length),
          sha256,
          visibility: input.visibility,
          createdById: actorUserId,
        },
      });

      const generatedDocument = await prisma.generatedDocument.create({
        data: {
          workspaceId,
          entityType,
          entityId,
          documentType: input.documentType,
          version,
          fileObjectId: fileObject.id,
          sha256,
          generatedById: actorUserId,
          metadata: JSON.stringify({
            manualUpload: true,
            displayName: input.displayName || null,
            notes: input.notes || null,
            originalFilename,
            storage: "s3",
          }),
        },
        include: { fileObject: true },
      });

      await this.auditService.log({
        workspaceId,
        actorUserId,
        action: "document.uploaded",
        entityType: "DOCUMENT",
        entityId: generatedDocument.id,
        after: {
          documentId: generatedDocument.id,
          documentType: input.documentType,
          linkedEntityType: entityType,
          linkedEntityId: entityId,
          originalFilename,
          sizeBytes: buffer.length,
          visibility: input.visibility,
        },
        ipAddress,
        userAgent,
        severity: "INFO",
      });

      return this.sanitizeDocument(generatedDocument, "OWNER");
    } catch (err: any) {
      await this.s3Client
        .send(new DeleteObjectCommand({ Bucket: this.s3Bucket, Key: key }))
        .catch(() => {});
      console.error("[DocumentsService] Manual upload DB failed:", err.message);
      throw new BadRequestException("Falha ao registrar documento no banco.");
    }
  }

  private async validateManualDocumentEntity(
    entityType: string,
    entityId: string,
    workspaceId: string,
  ) {
    const upperType = entityType.toUpperCase();
    if (upperType === "WORKSPACE") {
      if (entityId !== workspaceId) {
        throw new BadRequestException("Documento de workspace com entidade inválida.");
      }
      return;
    }
    const exists =
      upperType === "CLIENT"
        ? await prisma.client.findFirst({ where: { id: entityId, workspaceId } })
        : upperType === "TICKET"
          ? await prisma.ticket.findFirst({ where: { id: entityId, workspaceId } })
          : upperType === "CONTRACT"
            ? await prisma.contract.findFirst({ where: { id: entityId, workspaceId } })
            : upperType === "INVOICE"
              ? await prisma.invoice.findFirst({ where: { id: entityId, workspaceId } })
              : upperType === "QUOTE"
                ? await prisma.quote.findFirst({ where: { id: entityId, workspaceId } })
                : upperType === "SERVICE_ORDER"
                  ? await prisma.serviceOrder.findFirst({ where: { id: entityId, workspaceId } })
                  : null;

    if (!exists) {
      throw new BadRequestException("Entidade vinculada não encontrada.");
    }
  }

  private readonly pdfQueue = new Queue("pdf-generation", {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD || "change-me-in-production",
    },
  });

  async enqueueInvoicePdf(
    invoiceId: string,
    workspaceId: string,
    actorUserId: string,
  ) {
    return this.enqueueEntityPdf("INVOICE", invoiceId, workspaceId, actorUserId);
  }

  async enqueueQuotePdf(
    quoteId: string,
    workspaceId: string,
    actorUserId: string,
  ) {
    return this.enqueueEntityPdf("QUOTE", quoteId, workspaceId, actorUserId);
  }

  async enqueueServiceOrderPdf(
    serviceOrderId: string,
    workspaceId: string,
    actorUserId: string,
  ) {
    return this.enqueueEntityPdf(
      "SERVICE_ORDER",
      serviceOrderId,
      workspaceId,
      actorUserId,
    );
  }

  private async enqueueEntityPdf(
    entityType: "INVOICE" | "QUOTE" | "SERVICE_ORDER",
    entityId: string,
    workspaceId: string,
    actorUserId: string,
  ) {
    const entity = await this.ensureEntityExists(entityType, entityId, workspaceId);
    if (!entity) {
      const labels = {
        INVOICE: "Fatura",
        QUOTE: "Orçamento",
        SERVICE_ORDER: "Ordem de serviço",
      };
      throw new NotFoundException(`${labels[entityType]} não encontrada`);
    }

    const lastDoc = await prisma.generatedDocument.findFirst({
      where: {
        workspaceId,
        entityType,
        entityId,
        documentType: entityType,
      },
      orderBy: {
        version: "desc",
      },
      select: {
        version: true,
      },
    });
    const nextVersion = lastDoc ? lastDoc.version + 1 : 1;

    // 3. Enqueue job on BullMQ
    try {
      const job = await this.pdfQueue.add(
        "generate-pdf",
        {
          workspaceId,
          actorUserId,
          entityType,
          entityId,
          documentType: entityType,
          version: nextVersion,
        },
        {
          removeOnComplete: 10,
          removeOnFail: 50,
        },
      );

      return {
        jobId: job.id || "",
        status: "QUEUED" as const,
        entityType,
        entityId,
        nextVersion,
      };
    } catch (err: any) {
      console.error(
        "[DocumentsService] Failed to enqueue PDF generation job on Redis:",
        err,
      );
      throw new BadRequestException(
        "Serviço de enfileiramento temporariamente indisponível. Redis offline.",
      );
    }
  }

  private async ensureEntityExists(
    entityType: "INVOICE" | "QUOTE" | "SERVICE_ORDER",
    entityId: string,
    workspaceId: string,
  ) {
    if (entityType === "INVOICE") {
      return prisma.invoice.findFirst({ where: { id: entityId, workspaceId } });
    }
    if (entityType === "QUOTE") {
      return prisma.quote.findFirst({ where: { id: entityId, workspaceId } });
    }
    return prisma.serviceOrder.findFirst({ where: { id: entityId, workspaceId } });
  }

  async getJobStatus(jobId: string) {
    try {
      const job = await this.pdfQueue.getJob(jobId);
      if (!job) {
        return {
          jobId,
          status: "unknown" as const,
        };
      }

      const state = await job.getState();
      const failedReason = job.failedReason;

      let sanitizedResult: any = undefined;
      if (job.returnvalue) {
        sanitizedResult = {
          generatedDocumentId: job.returnvalue.generatedDocumentId,
          fileObjectId: job.returnvalue.fileObjectId,
          version: job.returnvalue.version,
        };
      }

      let sanitizedFailedReason: string | undefined = undefined;
      if (failedReason) {
        if (
          failedReason.includes("permissão") ||
          failedReason.includes("permission")
        ) {
          sanitizedFailedReason =
            "Permissão negada ao acessar o armazenamento.";
        } else if (
          failedReason.includes("PDF") ||
          failedReason.includes("gerar")
        ) {
          sanitizedFailedReason = "Falha ao gerar o arquivo PDF.";
        } else if (
          failedReason.includes("salvar") ||
          failedReason.includes("armazenamento") ||
          failedReason.includes("upload")
        ) {
          sanitizedFailedReason = "Falha ao salvar o arquivo no armazenamento.";
        } else if (
          failedReason.includes("banco") ||
          failedReason.includes("registrar")
        ) {
          sanitizedFailedReason = "Falha ao registrar o documento.";
        } else {
          sanitizedFailedReason =
            "Ocorreu um erro interno durante a geração do documento.";
        }
      }

      return {
        jobId,
        status: (state === "completed" ||
        state === "failed" ||
        state === "waiting" ||
        state === "active"
          ? state
          : "unknown") as any,
        result: sanitizedResult,
        failedReason: sanitizedFailedReason,
      };
    } catch (err: any) {
      console.error(
        `[DocumentsService] Failed to fetch job status for ${jobId}:`,
        err,
      );
      return {
        jobId,
        status: "unknown" as const,
      };
    }
  }

  async getFileStream(
    documentId: string,
    workspaceId: string,
    role: string,
    actorUserId: string,
    mode: "attachment" | "inline",
  ) {
    // 1. Fetch GeneratedDocument
    const doc = await prisma.generatedDocument.findFirst({
      where: { id: documentId, workspaceId },
      include: {
        fileObject: true,
      },
    });

    if (!doc || !doc.fileObject) {
      throw new NotFoundException("Documento não encontrado");
    }

    // 2. Validate RBAC (restrict INVOICE type to OWNER, ADMIN, FINANCIAL)
    if (doc.documentType === "INVOICE") {
      const hasFinancialPrivilege = ["OWNER", "ADMIN", "FINANCIAL"].includes(
        role,
      );
      if (!hasFinancialPrivilege) {
        throw new ForbiddenException(
          "Você não possui permissão para baixar ou visualizar este documento financeiro.",
        );
      }
    }

    // 3. Get file from MinIO S3
    console.log(
      `[DocumentsService] Fetching S3 object for document ${documentId} from bucket "${doc.fileObject.bucket}" key "${doc.fileObject.key}"...`,
    );
    let s3Response;
    try {
      s3Response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: doc.fileObject.bucket,
          Key: doc.fileObject.key,
        }),
      );
    } catch (err: any) {
      console.error(
        `[DocumentsService] MinIO GetObjectCommand failed for doc ${documentId}:`,
        err.message,
      );
      // Throw secure generic error to avoid exposing raw SDK error
      throw new NotFoundException(
        "Arquivo físico não encontrado no armazenamento em nuvem.",
      );
    }

    // 4. Validate Body exists and is a readable stream
    const isStream =
      s3Response.Body && typeof (s3Response.Body as any).pipe === "function";
    if (!isStream) {
      throw new BadRequestException(
        "O conteúdo retornado do armazenamento em nuvem não é um fluxo de dados válido.",
      );
    }

    // 5. Register audit log ONLY after successful retrieval success
    const auditAction =
      mode === "attachment" ? "document.downloaded" : "document.opened_inline";
    try {
      await this.auditService.log({
        workspaceId,
        actorUserId,
        action: auditAction,
        entityType: "DOCUMENT",
        entityId: documentId,
        severity: "INFO",
        after: {
          documentId,
          documentType: doc.documentType,
          entityType: doc.entityType,
          entityId: doc.entityId,
          version: doc.version,
          fileObjectId: doc.fileObjectId,
          sizeBytes: doc.fileObject.sizeBytes.toString(),
          sha256: doc.sha256,
        },
      });
    } catch (auditErr) {
      console.warn("[DocumentsService] Failed to write audit log:", auditErr);
    }

    let filename = doc.fileObject.originalFilename;
    if (doc.fileObject.mimeType === "application/pdf" && doc.metadata) {
      try {
        const meta = JSON.parse(doc.metadata);
        const safeNumber =
          meta.invoiceNumber ||
          meta.quoteNumber ||
          meta.serviceOrderNumber ||
          doc.version.toString();
        const sanitizedNumber = String(safeNumber).replace(
          /[^a-zA-Z0-9_-]/g,
          "_",
        );
        const prefix =
          doc.documentType === "QUOTE"
            ? "orcamento"
            : doc.documentType === "SERVICE_ORDER"
              ? "ordem-servico"
              : doc.documentType === "REPORT"
                ? "relatorio"
                : doc.documentType === "CONTRACT"
                  ? "contrato"
                  : "fatura";
        filename = `${prefix}-${sanitizedNumber}-v${doc.version}.pdf`;
      } catch {
        filename = doc.fileObject.originalFilename;
      }
    }

    return {
      stream: s3Response.Body,
      filename,
      mimeType: doc.fileObject.mimeType,
    };
  }
}

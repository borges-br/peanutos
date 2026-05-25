import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { prisma } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { DocumentQueryInput } from "@peanut/validators";
import { Queue } from "bullmq";

@Injectable()
export class DocumentsService {
  constructor(private readonly auditService: AuditService) {}

  private isUuid(val: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(val);
  }

  private sanitizeDocument(doc: any, role: string) {
    const { fileObject } = doc;
    if (!fileObject) {
      throw new Error(`FileObject relationship is missing for document ${doc.id}`);
    }

    let parsedMetadata = null;
    if (doc.metadata) {
      try {
        parsedMetadata = JSON.parse(doc.metadata);
        parsedMetadata = this.auditService.sanitizeForRead(parsedMetadata, role);
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

    if (role === "OWNER" || role === "ADMIN") {
      file.bucket = fileObject.bucket;
      file.key = fileObject.key;
    }

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
        { fileObject: { originalFilename: { contains: searchPattern, mode: "insensitive" } } },
        { fileObject: { mimeType: { contains: searchPattern, mode: "insensitive" } } },
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

    const sanitizedData = documents.map((doc) => this.sanitizeDocument(doc, role));

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

  async getById(id: string, workspaceId: string, role: string, actorUserId: string) {
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

  private readonly pdfQueue = new Queue("pdf-generation", {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD || "change-me-in-production",
    },
  });

  async enqueueInvoicePdf(invoiceId: string, workspaceId: string, actorUserId: string) {
    // 1. Validate invoice exists and belongs to the workspace
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
    });

    if (!invoice) {
      throw new NotFoundException("Fatura não encontrada");
    }

    // 2. Discover next version number
    const lastDoc = await prisma.generatedDocument.findFirst({
      where: {
        workspaceId,
        entityType: "INVOICE",
        entityId: invoiceId,
        documentType: "INVOICE",
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
          entityType: "INVOICE",
          entityId: invoiceId,
          documentType: "INVOICE",
          version: nextVersion,
        },
        {
          removeOnComplete: 10,
          removeOnFail: 50,
        }
      );

      return {
        jobId: job.id || "",
        status: "QUEUED" as const,
        invoiceId,
        nextVersion,
      };
    } catch (err: any) {
      console.error("[DocumentsService] Failed to enqueue PDF generation job on Redis:", err);
      throw new BadRequestException("Serviço de enfileiramento temporariamente indisponível. Redis offline.");
    }
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

      return {
        jobId,
        status: (state === "completed" || state === "failed" || state === "waiting" || state === "active" ? state : "unknown") as any,
        result: sanitizedResult,
        failedReason,
      };
    } catch (err: any) {
      console.error(`[DocumentsService] Failed to fetch job status for ${jobId}:`, err);
      return {
        jobId,
        status: "unknown" as const,
      };
    }
  }
}

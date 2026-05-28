import { Injectable, BadRequestException } from "@nestjs/common";
import { prisma } from "@peanut/db";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import * as crypto from "crypto";

const ALLOWED_IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

@Injectable()
export class StorageService {
  private readonly normalizeEndpoint = (ep?: string) => {
    const v = ep || "http://localhost:9000";
    return /^https?:\/\//i.test(v) ? v : `http://${v}`;
  };

  private readonly s3Endpoint = this.normalizeEndpoint(process.env.S3_ENDPOINT);
  private readonly s3Bucket =
    process.env.S3_BUCKET ||
    process.env.S3_BUCKET_NAME ||
    "peanut-os-documents";
  private readonly s3Region = process.env.S3_REGION || "us-east-1";
  private readonly s3ForcePathStyle =
    String(process.env.S3_FORCE_PATH_STYLE ?? "true") === "true";

  private readonly s3 = new S3Client({
    endpoint: this.s3Endpoint,
    region: this.s3Region,
    credentials: {
      accessKeyId:
        process.env.S3_ACCESS_KEY_ID ||
        process.env.S3_ACCESS_KEY ||
        "minio_admin",
      secretAccessKey:
        process.env.S3_SECRET_ACCESS_KEY ||
        process.env.S3_SECRET_KEY ||
        "change-me-in-production",
    },
    forcePathStyle: this.s3ForcePathStyle,
  });

  /**
   * Upload an image from base64-encoded payload.
   * Returns the new FileObject id and the key (internal — do not expose to frontend).
   */
  async uploadImage(opts: {
    workspaceId: string;
    actorUserId: string | null;
    folder: string;
    data: string;
    mimeType: string;
    filename: string;
  }): Promise<{ fileObjectId: string }> {
    if (!ALLOWED_IMAGE_MIMES.has(opts.mimeType)) {
      throw new BadRequestException("Tipo de arquivo não permitido");
    }

    // Strip data URL prefix if present (e.g. "data:image/png;base64,...")
    const base64 = opts.data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException("Arquivo excede o tamanho máximo de 2 MB");
    }

    if (opts.mimeType === "image/svg+xml") {
      const svg = buffer.toString("utf8");
      const unsafeSvgPattern =
        /<script|on\w+\s*=|<foreignObject|javascript:|data:text\/html/i;
      if (!svg.includes("<svg") || unsafeSvgPattern.test(svg)) {
        throw new BadRequestException("SVG inválido ou potencialmente inseguro");
      }
    }

    const ext =
      opts.mimeType === "image/svg+xml"
        ? "svg"
        : opts.mimeType.split("/")[1] || "bin";
    const uniqueKey = `${opts.workspaceId}/${opts.folder}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: uniqueKey,
          Body: buffer,
          ContentType: opts.mimeType,
        }),
      );
    } catch (err: any) {
      console.error("[StorageService] S3 upload failed:", err.message);
      throw new BadRequestException("Falha ao salvar arquivo no armazenamento");
    }

    try {
      const fileObject = await prisma.fileObject.create({
        data: {
          workspaceId: opts.workspaceId,
          bucket: this.s3Bucket,
          key: uniqueKey,
          originalFilename: opts.filename,
          mimeType: opts.mimeType,
          sizeBytes: BigInt(buffer.length),
          sha256,
          visibility: "PRIVATE",
          createdById: opts.actorUserId,
        },
      });
      return { fileObjectId: fileObject.id };
    } catch (dbErr: any) {
      // Cleanup orphaned S3 object
      await this.s3
        .send(
          new DeleteObjectCommand({ Bucket: this.s3Bucket, Key: uniqueKey }),
        )
        .catch(() => {});
      throw new BadRequestException(
        "Falha ao registrar arquivo no banco de dados",
      );
    }
  }

  /**
   * Delete a FileObject record (does NOT hard-delete the S3 object to preserve history).
   */
  async deleteFileObject(
    fileObjectId: string,
    workspaceId: string,
  ): Promise<void> {
    await prisma.fileObject.deleteMany({
      where: { id: fileObjectId, workspaceId },
    });
  }

  /**
   * Get the S3 client and bucket for streaming (used by files proxy).
   */
  getS3Config() {
    return { s3: this.s3, bucket: this.s3Bucket };
  }
}

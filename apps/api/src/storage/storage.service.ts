import { Injectable, BadRequestException } from "@nestjs/common";
import { prisma } from "@peanut/db";
import { LocalObjectStorage } from "@peanut/utils";
import * as crypto from "crypto";
import { assertStaticSvg } from "./static-svg";

const ALLOWED_IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

@Injectable()
export class StorageService {
  readonly objects = new LocalObjectStorage();

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
      try {
        assertStaticSvg(buffer.toString("utf8"));
      } catch {
        throw new BadRequestException(
          "Use um SVG estático válido, sem scripts, animações ou referências externas. Você também pode enviar PNG ou WebP.",
        );
      }
    }

    const ext =
      opts.mimeType === "image/svg+xml"
        ? "svg"
        : opts.mimeType.split("/")[1] || "bin";
    const uniqueKey = `${opts.workspaceId}/${opts.folder}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    try {
      await this.objects.put(this.objects.bucket, uniqueKey, buffer);
    } catch (err: any) {
      console.error("[StorageService] File upload failed:", err.message);
      throw new BadRequestException("Falha ao salvar arquivo no armazenamento");
    }

    try {
      const fileObject = await prisma.fileObject.create({
        data: {
          workspaceId: opts.workspaceId,
          bucket: this.objects.bucket,
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
      await this.objects.remove(this.objects.bucket, uniqueKey).catch(() => {});
      throw new BadRequestException(
        "Falha ao registrar arquivo no banco de dados",
      );
    }
  }

  /**
   * Delete a FileObject record (does NOT hard-delete the stored object to preserve history).
   */
  async deleteFileObject(
    fileObjectId: string,
    workspaceId: string,
  ): Promise<void> {
    await prisma.fileObject.deleteMany({
      where: { id: fileObjectId, workspaceId },
    });
  }
}

import {
  Controller,
  Get,
  Param,
  UseGuards,
  NotFoundException,
  Res,
} from "@nestjs/common";
import { prisma } from "@peanut/db";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { StorageService } from "../storage/storage.service";

@UseGuards(AuthGuard)
@Controller("files")
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  /**
   * Proxy endpoint: serves a private FileObject from persistent storage.
   * Only serves files belonging to the requester's workspace.
   */
  @Get(":fileObjectId")
  async serveFile(
    @Param("fileObjectId") fileObjectId: string,
    @CurrentUser() user: any,
    @Res() res: any,
  ) {
    // Dev diagnostic logging (safe — never exposes bucket/key to frontend)
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
      console.log(
        `[FilesController] GET /files/${fileObjectId} | user.workspaceId=${user.workspaceId}`,
      );
    }

    const fileObject = await prisma.fileObject.findFirst({
      where: { id: fileObjectId, workspaceId: user.workspaceId },
    });

    if (!fileObject) {
      if (isDev) {
        // Check if it exists in another workspace (debug only)
        const anyMatch = await prisma.fileObject.findUnique({
          where: { id: fileObjectId },
        });
        if (anyMatch) {
          console.warn(
            `[FilesController] FileObject ${fileObjectId} exists but belongs to workspace ${anyMatch.workspaceId}, not ${user.workspaceId}`,
          );
        } else {
          console.warn(
            `[FilesController] FileObject ${fileObjectId} does NOT exist in any workspace`,
          );
        }
      }
      throw new NotFoundException("Arquivo não encontrado");
    }

    if (isDev) {
      console.log(
        `[FilesController] Found: mime=${fileObject.mimeType}, key=${fileObject.key}`,
      );
    }

    let body;
    try {
      body = await this.storage.objects.get(fileObject.bucket, fileObject.key);
    } catch (err: any) {
      if (isDev) {
        console.error(
          `[FilesController] File read failed for key=${fileObject.key}:`,
          err.message,
        );
      }
      throw new NotFoundException("Arquivo não disponível no armazenamento");
    }

    if (isDev) {
      console.log(
        `[FilesController] Storage OK, streaming response for ${fileObject.originalFilename}`,
      );
    }

    // Use Fastify's native .send() with the readable stream — do NOT use stream.pipe(res.raw)

    return res
      .header("Content-Type", fileObject.mimeType)
      .header("Cache-Control", "private, max-age=3600")
      .header("X-Content-Type-Options", "nosniff")
      .header(
        "Content-Disposition",
        `inline; filename="${fileObject.originalFilename.replace(/[^\w.\- ()]/g, "_")}"`,
      )
      .send(body);
  }
}

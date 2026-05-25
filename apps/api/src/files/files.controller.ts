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
import { GetObjectCommand } from "@aws-sdk/client-s3";

@UseGuards(AuthGuard)
@Controller("files")
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  /**
   * Proxy endpoint: serves a FileObject from MinIO.
   * Only serves files belonging to the requester's workspace.
   */
  @Get(":fileObjectId")
  async serveFile(
    @Param("fileObjectId") fileObjectId: string,
    @CurrentUser() user: any,
    @Res() res: any,
  ) {
    const fileObject = await prisma.fileObject.findFirst({
      where: { id: fileObjectId, workspaceId: user.workspaceId },
    });

    if (!fileObject) {
      throw new NotFoundException("Arquivo não encontrado");
    }

    const { s3, bucket } = this.storage.getS3Config();

    let s3Response: any;
    try {
      s3Response = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: fileObject.key,
      }));
    } catch (err: any) {
      throw new NotFoundException("Arquivo não disponível no armazenamento");
    }

    res.header("Content-Type", fileObject.mimeType);
    res.header("Cache-Control", "private, max-age=3600");
    res.header("Content-Disposition", `inline; filename="${fileObject.originalFilename}"`);

    const stream = s3Response.Body as NodeJS.ReadableStream;
    stream.pipe(res.raw);
  }
}

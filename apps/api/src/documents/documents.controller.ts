import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  Res,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { DocumentsService } from "./documents.service";
import { documentQuerySchema } from "@peanut/validators";

@UseGuards(AuthGuard, RolesGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async list(@Query() query: any, @CurrentUser() user: any) {
    const validation = documentQuerySchema.safeParse(query);
    if (!validation.success) {
      const messages = validation.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    return this.documentsService.list(
      user.workspaceId,
      validation.data,
      user.role,
    );
  }

  @Post("invoices/:invoiceId/generate-pdf")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async generateInvoicePdf(
    @Param("invoiceId") invoiceId: string,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.enqueueInvoicePdf(
      invoiceId,
      user.workspaceId,
      user.id,
    );
  }

  @Get("jobs/:jobId")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async getJobStatus(@Param("jobId") jobId: string) {
    return this.documentsService.getJobStatus(jobId);
  }

  @Get(":documentId/download")
  async download(
    @Param("documentId") documentId: string,
    @CurrentUser() user: any,
    @Res() reply: any,
  ) {
    const result = await this.documentsService.getFileStream(
      documentId,
      user.workspaceId,
      user.role,
      user.id,
      "attachment",
    );

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="${result.filename}"`);
    reply.send(result.stream);
  }

  @Get(":documentId/inline")
  async inline(
    @Param("documentId") documentId: string,
    @CurrentUser() user: any,
    @Res() reply: any,
  ) {
    const result = await this.documentsService.getFileStream(
      documentId,
      user.workspaceId,
      user.role,
      user.id,
      "inline",
    );

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `inline; filename="${result.filename}"`);
    reply.send(result.stream);
  }

  @Get(":documentId")
  async getById(
    @Param("documentId") documentId: string,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.getById(
      documentId,
      user.workspaceId,
      user.role,
      user.id,
    );
  }
}

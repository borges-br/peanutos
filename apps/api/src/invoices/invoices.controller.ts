import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  Res,
  ForbiddenException,
} from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import {
  invoiceQuerySchema,
  invoiceCreateSchema,
  invoiceStatusUpdateSchema,
  invoiceUpdateSchema,
} from "@peanut/validators";

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get("invoices")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async list(@Query() query: any, @CurrentUser() user: any) {
    const validation = invoiceQuerySchema.safeParse(query);
    if (!validation.success) {
      const messages = validation.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    return this.invoicesService.list(
      user.workspaceId,
      validation.data,
      user.role,
    );
  }

  @Get("clients/:clientId/invoices")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async listClientInvoices(
    @Param("clientId") clientId: string,
    @Query() query: any,
    @CurrentUser() user: any,
  ) {
    // Inject clientId into query to let it be parsed properly
    const validation = invoiceQuerySchema.safeParse({ ...query, clientId });
    if (!validation.success) {
      const messages = validation.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    return this.invoicesService.list(
      user.workspaceId,
      validation.data,
      user.role,
    );
  }

  @Get("invoices/:invoiceId")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async getById(
    @Param("invoiceId") invoiceId: string,
    @CurrentUser() user: any,
  ) {
    return this.invoicesService.getById(invoiceId, user.workspaceId, user.role);
  }

  @Post("invoices")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async create(@Body() body: any, @CurrentUser() user: any, @Req() req: any) {
    const validation = invoiceCreateSchema.safeParse(body);
    if (!validation.success) {
      const messages = validation.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.invoicesService.create(
      validation.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Post("invoices/:invoiceId/approve-monthly")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async approveMonthly(@Param("invoiceId") invoiceId: string, @CurrentUser() user: any) {
    return this.invoicesService.approveMonthly(invoiceId, user.workspaceId, user.id);
  }

  @Post("invoices/:invoiceId/retry-email")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async retryEmail(@Param("invoiceId") invoiceId: string, @Body() body: any, @CurrentUser() user: any) {
    return this.invoicesService.retryMonthlyEmail(invoiceId, user.workspaceId, user.id, body?.confirmResend === true);
  }

  @Patch("invoices/:invoiceId/status")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async updateStatus(
    @Param("invoiceId") invoiceId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validation = invoiceStatusUpdateSchema.safeParse(body);
    if (!validation.success) {
      const messages = validation.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.invoicesService.updateStatus(
      invoiceId,
      validation.data,
      user.workspaceId,
      user.id,
      user.role,
      ipAddress,
      userAgent,
    );
  }

  @Patch("invoices/:invoiceId")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async update(
    @Param("invoiceId") invoiceId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validation = invoiceUpdateSchema.safeParse(body);
    if (!validation.success) {
      const messages = validation.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.invoicesService.update(
      invoiceId,
      validation.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Get("invoices/:invoiceId/preview")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async getPreview(
    @Param("invoiceId") invoiceId: string,
    @CurrentUser() user: any,
    @Res() reply: any,
  ) {
    const hasFinancialPrivilege = ["OWNER", "ADMIN", "FINANCIAL"].includes(
      user.role,
    );
    if (!hasFinancialPrivilege) {
      throw new ForbiddenException(
        "Você não possui permissão para visualizar o preview financeiro.",
      );
    }

    const html = await this.invoicesService.getInvoicePreviewHtml(
      invoiceId,
      user.workspaceId,
    );

    reply.header("Content-Type", "text/html; charset=utf-8");
    reply.send(html);
  }
}

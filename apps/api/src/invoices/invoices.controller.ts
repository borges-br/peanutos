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

    return this.invoicesService.list(user.workspaceId, validation.data, user.role);
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

    return this.invoicesService.list(user.workspaceId, validation.data, user.role);
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
}


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
} from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { prisma } from "@peanut/db";

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get("invoices")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async list(
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("search") search: string,
    @Query("status") status: string,
    @Query("clientId") clientId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.invoicesService.list(user.workspaceId, {
      page,
      limit,
      search,
      status,
      clientId,
    });

    // Sanitization: hide financial values from technicians/read-only roles
    const hasFinancialPrivilege = ["OWNER", "ADMIN", "FINANCIAL"].includes(user.role);
    if (!hasFinancialPrivilege) {
      result.data = result.data.map((inv: any) => ({
        ...inv,
        totalAmount: 0, // This tells the client to show "Valor protegido"
      }));
    }

    return result;
  }

  @Get("clients/:clientId/invoices")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async listClientInvoices(
    @Param("clientId") clientId: string,
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("search") search: string,
    @Query("status") status: string,
    @CurrentUser() user: any,
  ) {
    return this.list(page, limit, search, status, clientId, user);
  }

  @Get("invoices/:invoiceId")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async getById(
    @Param("invoiceId") invoiceId: string,
    @CurrentUser() user: any,
  ) {
    const invoice = await this.invoicesService.getById(invoiceId, user.workspaceId);

    // Sanitization: hide values from non-privileged roles
    const hasFinancialPrivilege = ["OWNER", "ADMIN", "FINANCIAL"].includes(user.role);
    if (!hasFinancialPrivilege) {
      invoice.totalAmount = 0 as any;
      if (invoice.items) {
        invoice.items = invoice.items.map((item: any) => ({
          ...item,
          unitPrice: 0,
          totalPrice: 0,
        }));
      }
    }

    return invoice;
  }

  @Post("invoices")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async create(@Body() body: any, @CurrentUser() user: any, @Req() req: any) {
    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.invoicesService.create(
      body,
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
    @Body() body: { status: string },
    @CurrentUser() user: any,
  ) {
    const updated = await prisma.invoice.update({
      where: { id: invoiceId, workspaceId: user.workspaceId },
      data: { status: body.status },
    });
    return updated;
  }
}

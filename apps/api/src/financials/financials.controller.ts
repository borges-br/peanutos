import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Patch,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { FinancialsService } from "./financials.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { billingScheduleQuerySchema } from "@peanut/validators";
import { BillingScheduleStatus } from "@peanut/db";
import { prisma, getFinancialForecast, getContractPeriodSummary, ContractBillingError } from '@peanut/db';
import { saveBillingEmailTemplate, previewInvoiceEmail } from '@peanut/db';
import { BILLING_EMAIL_VARIABLES, DEFAULT_BILLING_EMAIL, renderBillingEmail } from '@peanut/utils';

@UseGuards(AuthGuard, RolesGuard)
@Controller("financials")
@Roles("OWNER", "ADMIN", "FINANCIAL")
export class FinancialsController {
  constructor(private readonly financialsService: FinancialsService) {}

  @Get('email-templates')
  async templates(@CurrentUser() user: any) {
    return { data: await prisma.emailTemplate.findMany({ where: { workspaceId: user.workspaceId, active: true }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] }), variables: BILLING_EMAIL_VARIABLES, builtin: DEFAULT_BILLING_EMAIL };
  }

  @Post('email-templates/preview')
  async templatePreview(@Body() body: any) {
    try { return renderBillingEmail(body, { cliente: 'Cliente Demonstração', empresa: 'Empresa Demonstração', contrato: 'CTR-DEMO', competencia: '2026-11', fatura: 'FAT-DEMO', total: 'R$ 1.250,00', vencimento: '10/11/2026', fuso: 'America/Sao_Paulo' }); }
    catch (e: any) { throw new BadRequestException(e.message); }
  }

  @Post('email-templates')
  async createTemplate(@CurrentUser() user: any, @Body() body: any) {
    try { return await saveBillingEmailTemplate(prisma, user.workspaceId, user.id, body); }
    catch (e) { if (e instanceof ContractBillingError) throw new BadRequestException(e.message); throw e; }
  }

  @Patch('email-templates/:id')
  async updateTemplate(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    try { return await saveBillingEmailTemplate(prisma, user.workspaceId, user.id, body, id); }
    catch (e) { if (e instanceof ContractBillingError) throw new BadRequestException(e.message); throw e; }
  }

  @Get('invoices/:id/email-preview')
  async emailPreview(@CurrentUser() user: any, @Param('id') id: string) {
    try { return await previewInvoiceEmail(prisma, user.workspaceId, id); }
    catch (e) { if (e instanceof ContractBillingError) throw new BadRequestException(e.message); throw e; }
  }

  @Get('forecast')
  async forecast(@CurrentUser() user: any, @Query('period') period?: string) {
    try { return await getFinancialForecast(prisma, user.workspaceId, period); }
    catch (e) { if (e instanceof ContractBillingError) throw new BadRequestException(e.message); throw e; }
  }

  @Get('contracts/:id/summary')
  async contractSummary(@CurrentUser() user: any, @Param('id') id: string, @Query('period') period: string) {
    try { return await getContractPeriodSummary(prisma, user.workspaceId, id, period); }
    catch (e) { if (e instanceof ContractBillingError) throw new BadRequestException(e.message); throw e; }
  }

  @Get("mrr")
  async getMrr(@CurrentUser() user: any, @Req() req: any) {
    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.financialsService.getMrrMetrics(
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Get("billing-schedule")
  async getBillingSchedule(
    @Query("status") status: BillingScheduleStatus,
    @Query("contractId") contractId: string,
    @Query("clientId") clientId: string,
    @Query("page") page: number,
    @Query("limit") limit: number,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    // Validate inputs
    const parseResult = billingScheduleQuerySchema.safeParse({
      status,
      contractId,
      clientId,
    });

    if (!parseResult.success) {
      const messages = parseResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.financialsService.getBillingSchedule(
      user.workspaceId,
      user.id,
      {
        status,
        contractId,
        clientId,
        page,
        limit,
      },
      ipAddress,
      userAgent,
    );
  }
}

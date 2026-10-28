import { Controller, Get, Post, Put, Body, Param, UseGuards, BadRequestException, HttpCode, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { prisma, Prisma, listBillingConnections, saveBillingConnection, billingProvider, createInvoiceCharge, reconcileInvoiceCharge, acceptAsaasWebhook, ContractBillingError, BillingProviderError } from '@peanut/db';
const error = (e: unknown): never => { if (e instanceof ContractBillingError || e instanceof BillingProviderError) throw new BadRequestException(e.message); throw e; };

@Controller('financials')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'FINANCIAL')
export class BillingGatewayController {
  @Post('charges/:id/cancel-request')
  async cancelRequest(@CurrentUser() user: any, @Param('id') id: string) {
    return prisma.$transaction(async tx => {
      const found = await tx.billingCharge.findFirst({ where: { id, invoice: { workspaceId: user.workspaceId } } });
      if (!found) throw new BadRequestException('Programação não encontrada.');
      await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${found.invoiceId}::uuid FOR UPDATE`;
      const current = await tx.billingCharge.findUniqueOrThrow({ where: { id }, include: { invoice: true } });
      if (current.state !== 'REQUESTED' || current.invoice.status !== 'DRAFT') throw new BadRequestException('Só é possível remover a programação antes da emissão. Cobranças externas devem ser tratadas no provedor.');
      await tx.billingScheduleEvent.updateMany({ where: { invoiceId: current.invoiceId }, data: { approvedAt: null, approvedById: null, emailTemplateSnapshot: Prisma.DbNull } });
      await tx.auditLog.create({ data: { workspaceId: user.workspaceId, actorUserId: user.id, action: 'financial.charge_request_cancelled', entityType: 'INVOICE', entityId: current.invoiceId, severity: 'INFO' } });
      return tx.billingCharge.update({ where: { id }, data: { state: 'CANCELLED' } });
    });
  }
  @Get('gateways')
  list(@CurrentUser() user: any) { return listBillingConnections(prisma, user.workspaceId); }

  @Put('gateways')
  @Roles('OWNER', 'ADMIN')
  async save(@CurrentUser() user: any, @Body() body: any) { try { return await saveBillingConnection(prisma, user.workspaceId, user.id, body); } catch (e) { return error(e); } }

  @Post('gateways/:id/test')
  @Roles('OWNER', 'ADMIN')
  async test(@CurrentUser() user: any, @Param('id') id: string) {
    try {
      const row = await prisma.billingConnection.findFirst({ where: { id, workspaceId: user.workspaceId } });
      if (!row) throw new BadRequestException('Conexão não encontrada.');
      await billingProvider(row).verifyConnection();
      return { ok: true, message: 'A autenticação de consulta funcionou. Isso não cria cobranças nem comprova recebimento de webhooks.' };
    } catch (e) { return error(e); }
  }

  @Get('gateways/:id/webhook-info')
  @Roles('OWNER', 'ADMIN')
  async webhookInfo(@CurrentUser() user: any, @Param('id') id: string) {
    const row = await prisma.billingConnection.findFirst({ where: { id, workspaceId: user.workspaceId } });
    if (!row) throw new BadRequestException('Conexão não encontrada.');
    const origin = process.env.NEXT_PUBLIC_WEB_URL;
    return { path: `/api/v1/financial-hooks/asaas/${id}`, url: origin ? new URL(`/api/v1/financial-hooks/asaas/${id}`, origin).href : null,
      header: 'asaas-access-token', events: ['PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_RESTORED', 'PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED'] };
  }

  @Get('invoices/:id/charges')
  async charges(@CurrentUser() user: any, @Param('id') id: string) {
    const invoice = await prisma.invoice.findFirst({ where: { id, workspaceId: user.workspaceId }, include: { contract: true } });
    if (!invoice) throw new BadRequestException('Fatura não encontrada.');
    const rows = await prisma.billingCharge.findMany({ where: { invoiceId: id }, orderBy: { createdAt: 'asc' }, include: { connection: { select: { provider: true, environment: true } }, entries: { orderBy: { occurredAt: 'desc' } } } });
    return { data: rows, suggestedType: invoice.contract?.gatewayBillingType || 'PIX', connections: (await listBillingConnections(prisma, user.workspaceId)).filter(row => row.enabled) };
  }

  @Post('invoices/:id/charges')
  async create(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    if (typeof body?.connectionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.connectionId)) throw new BadRequestException('Selecione a conexão.');
    try { return await createInvoiceCharge(prisma, user.workspaceId, id, body.connectionId, body.billingType, user.id); } catch (e) { return error(e); }
  }

  @Post('charges/:id/reconcile')
  async reconcile(@CurrentUser() user: any, @Param('id') id: string) { try { return await reconcileInvoiceCharge(prisma, user.workspaceId, id); } catch (e) { return error(e); } }
}

@Controller('financial-hooks/asaas')
export class AsaasWebhookController {
  @Post(':id')
  @HttpCode(200)
  async receive(@Param('id') id: string, @Headers('asaas-access-token') token: string, @Body() body: any) {
    try { return await acceptAsaasWebhook(prisma, id, token, body); }
    catch (e) { if (e instanceof ContractBillingError && e.message.includes('não autorizado')) throw new UnauthorizedException('Webhook não autorizado.'); return error(e); }
  }
}

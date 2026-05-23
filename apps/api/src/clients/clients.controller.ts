import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { clientSchema, clientContactSchema } from '@peanut/validators';
import { ClientStatus } from '@peanut/db';

@UseGuards(AuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async list(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search: string,
    @Query('status') status: ClientStatus,
    @CurrentUser() user: any,
  ) {
    return this.clientsService.list(user.workspaceId, { page, limit, search, status });
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.clientsService.getById(id, user.workspaceId);
  }

  @Roles('OWNER', 'ADMIN', 'TECHNICIAN')
  @Post()
  async create(
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validationResult = clientSchema.safeParse(body);
    if (!validationResult.success) {
      const messages = validationResult.error.errors.map(e => e.message).join(', ');
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.headers?.['user-agent'] || 'Unknown';

    return this.clientsService.create(
      validationResult.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles('OWNER', 'ADMIN', 'TECHNICIAN')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const data: any = {};
    if (body.legalName) data.legalName = body.legalName;
    if (body.tradeName) data.tradeName = body.tradeName;
    if (body.document) data.document = body.document;
    if (body.email) data.email = body.email;
    if (body.phone) data.phone = body.phone;
    if (body.website !== undefined) data.website = body.website;
    if (body.notes !== undefined) data.notes = body.notes;

    const ipAddress = req.ip || req.headers?.['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.headers?.['user-agent'] || 'Unknown';

    return this.clientsService.update(
      id,
      data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles('OWNER', 'ADMIN', 'TECHNICIAN')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: ClientStatus },
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    if (!body.status || !['ACTIVE', 'INACTIVE', 'PROSPECT'].includes(body.status)) {
      throw new BadRequestException('Status inválido');
    }

    const ipAddress = req.ip || req.headers?.['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.headers?.['user-agent'] || 'Unknown';

    return this.clientsService.updateStatus(
      id,
      body.status,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  // --- CONTACTS SUB-ROUTES ---

  @Get(':clientId/contacts')
  async listContacts(@Param('clientId') clientId: string, @CurrentUser() user: any) {
    return this.clientsService.listContacts(clientId, user.workspaceId);
  }

  @Roles('OWNER', 'ADMIN', 'TECHNICIAN')
  @Post(':clientId/contacts')
  async createContact(
    @Param('clientId') clientId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validationResult = clientContactSchema.safeParse(body);
    if (!validationResult.success) {
      const messages = validationResult.error.errors.map(e => e.message).join(', ');
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.headers?.['user-agent'] || 'Unknown';

    return this.clientsService.createContact(
      clientId,
      validationResult.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles('OWNER', 'ADMIN', 'TECHNICIAN')
  @Patch(':clientId/contacts/:contactId')
  async updateContact(
    @Param('clientId') clientId: string,
    @Param('contactId') contactId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const data: any = {};
    if (body.name) data.name = body.name;
    if (body.email) data.email = body.email;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.mobile !== undefined) data.mobile = body.mobile;
    if (body.role !== undefined) data.role = body.role;
    if (body.department !== undefined) data.department = body.department;
    if (body.isPrimary !== undefined) data.isPrimary = body.isPrimary;
    if (body.notes !== undefined) data.notes = body.notes;

    const ipAddress = req.ip || req.headers?.['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.headers?.['user-agent'] || 'Unknown';

    return this.clientsService.updateContact(
      clientId,
      contactId,
      data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles('OWNER', 'ADMIN', 'TECHNICIAN')
  @Delete(':clientId/contacts/:contactId')
  async deleteContact(
    @Param('clientId') clientId: string,
    @Param('contactId') contactId: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers?.['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.headers?.['user-agent'] || 'Unknown';

    return this.clientsService.deleteContact(
      clientId,
      contactId,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }
}

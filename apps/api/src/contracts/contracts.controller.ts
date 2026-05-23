import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { ContractsService } from "./contracts.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import {
  contractCreateSchema,
  contractUpdateSchema,
  contractStatusUpdateSchema,
  contractLineItemCreateSchema,
  contractLineItemUpdateSchema,
} from "@peanut/validators";
import { ContractStatus, ContractType } from "@peanut/db";
import { ContractsQuotaService } from "./contracts-quota.service";

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly contractsQuotaService: ContractsQuotaService,
  ) {}

  @Get("contracts")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async list(
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("search") search: string,
    @Query("status") status: ContractStatus,
    @Query("type") type: ContractType,
    @Query("clientId") clientId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.contractsService.list(user.workspaceId, {
      page,
      limit,
      search,
      status,
      type,
      clientId,
    });

    // Sanitization: block financial amounts for technicians/read-only roles
    const hasFinancialPrivilege = ["OWNER", "ADMIN", "FINANCIAL"].includes(
      user.role,
    );
    if (!hasFinancialPrivilege) {
      result.data = result.data.map((c: any) => ({
        ...c,
        monthlyAmountCents: 0,
      }));
    }

    return result;
  }

  @Get("clients/:clientId/contracts")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async listClientContracts(
    @Param("clientId") clientId: string,
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("search") search: string,
    @Query("status") status: ContractStatus,
    @Query("type") type: ContractType,
    @CurrentUser() user: any,
  ) {
    return this.list(page, limit, search, status, type, clientId, user);
  }

  @Get("contracts-quota/client/:clientId")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async getClientQuotaDetails(
    @Param("clientId") clientId: string,
    @CurrentUser() user: any,
  ) {
    return this.contractsQuotaService.getClientQuotaDetails(
      user.workspaceId,
      clientId,
    );
  }

  @Get("contracts/:contractId")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async getById(
    @Param("contractId") contractId: string,
    @CurrentUser() user: any,
  ) {
    const contract = await this.contractsService.getById(
      contractId,
      user.workspaceId,
    );

    // Sanitization: hide values from non-privileged roles
    const hasFinancialPrivilege = ["OWNER", "ADMIN", "FINANCIAL"].includes(
      user.role,
    );
    if (!hasFinancialPrivilege) {
      contract.monthlyAmountCents = 0;
      if (contract.lineItems) {
        contract.lineItems = contract.lineItems.map((item: any) => ({
          ...item,
          unitPriceCents: 0,
          totalPriceCents: 0,
        }));
      }
    }

    return contract;
  }

  @Get("contracts/:contractId/history")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async getHistory(
    @Param("contractId") contractId: string,
    @CurrentUser() user: any,
  ) {
    return this.contractsService.getHistory(contractId, user.workspaceId);
  }

  @Post("contracts")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async create(@Body() body: any, @CurrentUser() user: any, @Req() req: any) {
    const parseResult = contractCreateSchema.safeParse(body);
    if (!parseResult.success) {
      const messages = parseResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.contractsService.create(
      parseResult.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Post("clients/:clientId/contracts")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async createClientContract(
    @Param("clientId") clientId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.create({ ...body, clientId }, user, req);
  }

  @Patch("contracts/:contractId")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async update(
    @Param("contractId") contractId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const parseResult = contractUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      const messages = parseResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.contractsService.update(
      contractId,
      parseResult.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Patch("contracts/:contractId/status")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async updateStatus(
    @Param("contractId") contractId: string,
    @Body() body: { status: ContractStatus },
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const parseResult = contractStatusUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      const messages = parseResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.contractsService.updateStatus(
      contractId,
      parseResult.data.status,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  // --- CONTRACT LINE ITEMS SUB-ROUTES ---

  @Post("contracts/:contractId/line-items")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async addLineItem(
    @Param("contractId") contractId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const parseResult = contractLineItemCreateSchema.safeParse(body);
    if (!parseResult.success) {
      const messages = parseResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.contractsService.addLineItem(
      contractId,
      parseResult.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Patch("contracts/:contractId/line-items/:lineItemId")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async updateLineItem(
    @Param("contractId") contractId: string,
    @Param("lineItemId") lineItemId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const parseResult = contractLineItemUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      const messages = parseResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.contractsService.updateLineItem(
      contractId,
      lineItemId,
      parseResult.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Delete("contracts/:contractId/line-items/:lineItemId")
  @Roles("OWNER", "ADMIN", "FINANCIAL")
  async deleteLineItem(
    @Param("contractId") contractId: string,
    @Param("lineItemId") lineItemId: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.contractsService.deleteLineItem(
      contractId,
      lineItemId,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }
}

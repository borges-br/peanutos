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
import { InventoryService } from "./inventory.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import {
  assetCreateSchema,
  assetUpdateSchema,
  assetStatusUpdateSchema,
  assetAssignmentSchema,
  assetNoteCreateSchema,
} from "@peanut/validators";

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Roles("OWNER", "ADMIN", "TECHNICIAN", "READ_ONLY")
  @Get("assets")
  async listGlobal(
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("search") search: string,
    @Query("status") status: string,
    @Query("type") type: string,
    @Query("clientId") clientId: string,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.listGlobal(user.workspaceId, {
      page,
      limit,
      search,
      status,
      type,
      clientId,
    });
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN", "READ_ONLY")
  @Get("clients/:clientId/assets")
  async listByClient(
    @Param("clientId") clientId: string,
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("search") search: string,
    @Query("status") status: string,
    @Query("type") type: string,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.listByClient(user.workspaceId, clientId, {
      page,
      limit,
      search,
      status,
      type,
    });
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN", "READ_ONLY")
  @Get("clients/:clientId/assets/:assetId")
  async getById(
    @Param("clientId") clientId: string,
    @Param("assetId") assetId: string,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.getById(user.workspaceId, clientId, assetId);
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Post("clients/:clientId/assets/import-csv")
  async importCsv(
    @Param("clientId") clientId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    if (!body?.csvText || typeof body.csvText !== "string") {
      throw new BadRequestException("Envie o conteudo do arquivo CSV.");
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.inventoryService.importCsv(
      user.workspaceId,
      clientId,
      body.csvText,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Post("clients/:clientId/assets")
  async create(
    @Param("clientId") clientId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validationResult = assetCreateSchema.safeParse(body);
    if (!validationResult.success) {
      const messages = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.inventoryService.create(
      user.workspaceId,
      clientId,
      validationResult.data,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Patch("clients/:clientId/assets/:assetId")
  async update(
    @Param("clientId") clientId: string,
    @Param("assetId") assetId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validationResult = assetUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      const messages = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.inventoryService.update(
      user.workspaceId,
      clientId,
      assetId,
      validationResult.data,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Patch("clients/:clientId/assets/:assetId/status")
  async updateStatus(
    @Param("clientId") clientId: string,
    @Param("assetId") assetId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validationResult = assetStatusUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      const messages = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.inventoryService.updateStatus(
      user.workspaceId,
      clientId,
      assetId,
      validationResult.data.status,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Delete("clients/:clientId/assets/:assetId")
  async delete(
    @Param("clientId") clientId: string,
    @Param("assetId") assetId: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.inventoryService.delete(
      user.workspaceId,
      clientId,
      assetId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Post("clients/:clientId/assets/:assetId/assign")
  async assign(
    @Param("clientId") clientId: string,
    @Param("assetId") assetId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validationResult = assetAssignmentSchema.safeParse(body);
    if (!validationResult.success) {
      const messages = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.inventoryService.assign(
      user.workspaceId,
      clientId,
      assetId,
      validationResult.data.clientUserId || null,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Post("clients/:clientId/assets/:assetId/unassign")
  async unassign(
    @Param("clientId") clientId: string,
    @Param("assetId") assetId: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.inventoryService.assign(
      user.workspaceId,
      clientId,
      assetId,
      null,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Post("clients/:clientId/assets/:assetId/reveal-sensitive-data")
  async revealSensitiveData(
    @Param("clientId") clientId: string,
    @Param("assetId") assetId: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.inventoryService.revealSensitiveData(
      user.workspaceId,
      clientId,
      assetId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Post("clients/:clientId/assets/:assetId/notes")
  async createNote(
    @Param("clientId") clientId: string,
    @Param("assetId") assetId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validationResult = assetNoteCreateSchema.safeParse(body);
    if (!validationResult.success) {
      const messages = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.inventoryService.createNote(
      user.workspaceId,
      clientId,
      assetId,
      validationResult.data.content,
      validationResult.data.visibility,
      user.id,
      ipAddress,
      userAgent,
    );
  }
}

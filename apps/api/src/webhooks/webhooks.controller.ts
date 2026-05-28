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
import { WebhooksService } from "./webhooks.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import {
  createWebhookEndpointSchema,
  updateWebhookEndpointSchema,
  webhookDeliveryQuerySchema,
  createInboundWebhookSchema,
  updateInboundWebhookSchema,
  webhookAutomationSettingsSchema,
} from "@peanut/validators";

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get("webhooks")
  @Roles("OWNER", "ADMIN", "READ_ONLY")
  async list(@CurrentUser() user: any) {
    return this.webhooksService.list(user.workspaceId, user.role);
  }

  @Get("webhooks/settings")
  @Roles("OWNER", "ADMIN", "READ_ONLY")
  async getSettings(@CurrentUser() user: any) {
    return this.webhooksService.getSettings(user.workspaceId, user.role);
  }

  @Patch("webhooks/settings")
  @Roles("OWNER", "ADMIN")
  async updateSettings(
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validation = webhookAutomationSettingsSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.webhooksService.updateSettings(
      validation.data,
      user.workspaceId,
      user.id,
      user.role,
      ip,
      ua,
    );
  }

  @Post("webhooks")
  @Roles("OWNER", "ADMIN")
  async create(@Body() body: any, @CurrentUser() user: any, @Req() req: any) {
    const validation = createWebhookEndpointSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.webhooksService.create(
      validation.data,
      user.workspaceId,
      user.id,
      user.role,
      ip,
      ua,
    );
  }

  @Get("webhooks/deliveries/:deliveryId")
  @Roles("OWNER", "ADMIN", "READ_ONLY")
  async getDeliveryGlobal(
    @Param("deliveryId") deliveryId: string,
    @CurrentUser() user: any,
  ) {
    return this.webhooksService.getDelivery(
      deliveryId,
      user.workspaceId,
      user.role,
    );
  }

  @Get("webhooks/:id")
  @Roles("OWNER", "ADMIN", "READ_ONLY")
  async getById(@Param("id") id: string, @CurrentUser() user: any) {
    return this.webhooksService.getById(id, user.workspaceId, user.role);
  }

  @Patch("webhooks/:id")
  @Roles("OWNER", "ADMIN")
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validation = updateWebhookEndpointSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.webhooksService.update(
      id,
      validation.data,
      user.workspaceId,
      user.id,
      user.role,
      ip,
      ua,
    );
  }

  @Delete("webhooks/:id")
  @Roles("OWNER", "ADMIN")
  async disable(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.webhooksService.disable(
      id,
      user.workspaceId,
      user.id,
      user.role,
      ip,
      ua,
    );
  }

  @Post("webhooks/:id/rotate-secret")
  @Roles("OWNER", "ADMIN")
  async rotateSecret(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.webhooksService.rotateSecret(
      id,
      user.workspaceId,
      user.id,
      user.role,
      ip,
      ua,
    );
  }

  @Post("webhooks/:id/test")
  @Roles("OWNER", "ADMIN")
  async sendTest(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.webhooksService.sendTest(
      id,
      user.workspaceId,
      user.id,
      user.role,
      ip,
      ua,
    );
  }

  @Get("webhooks/:id/deliveries")
  @Roles("OWNER", "ADMIN", "READ_ONLY")
  async listDeliveries(
    @Param("id") id: string,
    @Query() query: any,
    @CurrentUser() user: any,
  ) {
    const validation = webhookDeliveryQuerySchema.safeParse(query);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }
    return this.webhooksService.listDeliveries(
      id,
      user.workspaceId,
      validation.data,
      user.role,
    );
  }

  // ============================================================================
  // INBOUND WEBHOOK ENDPOINTS CRUD
  // ============================================================================

  @Get("inbound-webhooks")
  @Roles("OWNER", "ADMIN", "READ_ONLY")
  async listInbound(@CurrentUser() user: any) {
    return this.webhooksService.listInbound(user.workspaceId, user.role);
  }

  @Get("inbound-webhooks/:id")
  @Roles("OWNER", "ADMIN", "READ_ONLY")
  async getInboundById(@Param("id") id: string, @CurrentUser() user: any) {
    return this.webhooksService.getInboundById(id, user.workspaceId, user.role);
  }

  @Post("inbound-webhooks")
  @Roles("OWNER", "ADMIN")
  async createInbound(
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validation = createInboundWebhookSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.webhooksService.createInbound(
      validation.data,
      user.workspaceId,
      user.id,
      user.role,
      ip,
      ua,
    );
  }

  @Patch("inbound-webhooks/:id")
  @Roles("OWNER", "ADMIN")
  async updateInbound(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validation = updateInboundWebhookSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.webhooksService.updateInbound(
      id,
      validation.data,
      user.workspaceId,
      user.id,
      user.role,
      ip,
      ua,
    );
  }

  @Delete("inbound-webhooks/:id")
  @Roles("OWNER", "ADMIN")
  async deleteInbound(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.webhooksService.deleteInbound(
      id,
      user.workspaceId,
      user.id,
      user.role,
      ip,
      ua,
    );
  }

  @Post("inbound-webhooks/:id/rotate-secret")
  @Roles("OWNER", "ADMIN")
  async rotateInboundSecret(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.webhooksService.rotateInboundSecret(
      id,
      user.workspaceId,
      user.id,
      user.role,
      ip,
      ua,
    );
  }
}

import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ServiceOrdersService } from "./service-orders.service";
import {
  serviceOrderCreateSchema,
  serviceOrderQuerySchema,
  serviceOrderStatusUpdateSchema,
  serviceOrderUpdateSchema,
} from "@peanut/validators";

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Get("service-orders")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async list(@Query() query: any, @CurrentUser() user: any) {
    const validation = serviceOrderQuerySchema.safeParse(query);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }
    return this.serviceOrdersService.list(user.workspaceId, validation.data);
  }

  @Get("clients/:clientId/service-orders")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async listClientServiceOrders(
    @Param("clientId") clientId: string,
    @Query() query: any,
    @CurrentUser() user: any,
  ) {
    const validation = serviceOrderQuerySchema.safeParse({ ...query, clientId });
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }
    return this.serviceOrdersService.list(user.workspaceId, validation.data);
  }

  @Get("service-orders/:serviceOrderId")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async getById(
    @Param("serviceOrderId") serviceOrderId: string,
    @CurrentUser() user: any,
  ) {
    return this.serviceOrdersService.getById(serviceOrderId, user.workspaceId);
  }

  @Post("service-orders")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN")
  async create(@Body() body: any, @CurrentUser() user: any, @Req() req: any) {
    const validation = serviceOrderCreateSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }

    return this.serviceOrdersService.create(
      validation.data,
      user.workspaceId,
      user.id,
      req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1",
      req.headers?.["user-agent"] || "Unknown",
    );
  }

  @Patch("service-orders/:serviceOrderId")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN")
  async update(
    @Param("serviceOrderId") serviceOrderId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validation = serviceOrderUpdateSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }

    return this.serviceOrdersService.update(
      serviceOrderId,
      validation.data,
      user.workspaceId,
      user.id,
      req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1",
      req.headers?.["user-agent"] || "Unknown",
    );
  }

  @Patch("service-orders/:serviceOrderId/status")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN")
  async updateStatus(
    @Param("serviceOrderId") serviceOrderId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validation = serviceOrderStatusUpdateSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException(
        validation.error.errors.map((e) => e.message).join(", "),
      );
    }

    return this.serviceOrdersService.updateStatus(
      serviceOrderId,
      validation.data,
      user.workspaceId,
      user.id,
      req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1",
      req.headers?.["user-agent"] || "Unknown",
    );
  }

  @Get("service-orders/:serviceOrderId/preview")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async getPreview(
    @Param("serviceOrderId") serviceOrderId: string,
    @CurrentUser() user: any,
    @Res() reply: any,
  ) {
    const html = await this.serviceOrdersService.getServiceOrderPreviewHtml(
      serviceOrderId,
      user.workspaceId,
    );
    reply.header("Content-Type", "text/html; charset=utf-8");
    reply.send(html);
  }
}

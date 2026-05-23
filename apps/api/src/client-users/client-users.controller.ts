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
import { ClientUsersService } from "./client-users.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import {
  clientUserCreateSchema,
  clientUserUpdateSchema,
  clientUserStatusUpdateSchema,
} from "@peanut/validators";

@UseGuards(AuthGuard, RolesGuard)
@Controller("clients/:clientId/users")
export class ClientUsersController {
  constructor(private readonly clientUsersService: ClientUsersService) {}

  @Roles("OWNER", "ADMIN", "TECHNICIAN", "READ_ONLY")
  @Get()
  async list(
    @Param("clientId") clientId: string,
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("search") search: string,
    @Query("status") status: string,
    @CurrentUser() user: any,
  ) {
    return this.clientUsersService.list(user.workspaceId, clientId, {
      page,
      limit,
      search,
      status,
    });
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN", "READ_ONLY")
  @Get(":userId")
  async getById(
    @Param("clientId") clientId: string,
    @Param("userId") userId: string,
    @CurrentUser() user: any,
  ) {
    return this.clientUsersService.getById(user.workspaceId, clientId, userId);
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Post()
  async create(
    @Param("clientId") clientId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validationResult = clientUserCreateSchema.safeParse(body);
    if (!validationResult.success) {
      const messages = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.clientUsersService.create(
      user.workspaceId,
      clientId,
      validationResult.data,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Patch(":userId")
  async update(
    @Param("clientId") clientId: string,
    @Param("userId") userId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validationResult = clientUserUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      const messages = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.clientUsersService.update(
      user.workspaceId,
      clientId,
      userId,
      validationResult.data,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Patch(":userId/status")
  async updateStatus(
    @Param("clientId") clientId: string,
    @Param("userId") userId: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validationResult = clientUserStatusUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      const messages = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.clientUsersService.updateStatus(
      user.workspaceId,
      clientId,
      userId,
      validationResult.data.status,
      user.id,
      ipAddress,
      userAgent,
    );
  }
}

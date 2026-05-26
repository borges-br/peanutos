import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import {
  createWorkspaceUserSchema,
  updateWorkspaceUserRoleSchema,
  updateWorkspaceUserStatusSchema,
  updateUserProfileSchema,
  uploadImageSchema,
} from "@peanut/validators";

@UseGuards(AuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles("OWNER", "ADMIN", "TECHNICIAN")
  @Get()
  async list(@CurrentUser() user: any) {
    return this.usersService.list(user.workspaceId);
  }

  @Roles("OWNER", "ADMIN")
  @Get(":id")
  async getById(@Param("id") id: string, @CurrentUser() user: any) {
    return this.usersService.getById(id, user.workspaceId);
  }

  @Roles("OWNER", "ADMIN")
  @Post()
  async create(@Body() body: any, @CurrentUser() user: any, @Req() req: any) {
    const result = createWorkspaceUserSchema.safeParse(body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.usersService.create(
      result.data,
      user.workspaceId,
      user.id,
      user.role,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN")
  @Patch(":id/role")
  async updateRole(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const result = updateWorkspaceUserRoleSchema.safeParse(body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.usersService.updateRole(
      id,
      result.data,
      user.workspaceId,
      user.id,
      user.role,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN")
  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const result = updateWorkspaceUserStatusSchema.safeParse(body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.usersService.updateStatus(
      id,
      result.data.status,
      user.workspaceId,
      user.id,
      user.role,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN")
  @Delete(":id")
  async deleteUser(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";
    return this.usersService.deleteUser(
      id,
      user.workspaceId,
      user.id,
      user.role,
      ipAddress,
      userAgent,
    );
  }

  // ─── My Profile & Document Identity ──────────────────────────────────────────

  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  @Get("me/profile")
  async getMyProfile(@CurrentUser() user: any) {
    return this.usersService.getMyProfile(user.id, user.workspaceId);
  }

  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  @Patch("me/profile")
  async updateMyProfile(
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const result = updateUserProfileSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(", "),
      );
    }
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.usersService.updateMyProfile(
      user.id,
      user.workspaceId,
      result.data,
      ip,
      ua,
    );
  }

  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  @Post("me/avatar")
  async uploadAvatar(
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const result = uploadImageSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(", "),
      );
    }
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.usersService.uploadAvatar(
      user.id,
      user.workspaceId,
      result.data,
      ip,
      ua,
    );
  }

  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  @Delete("me/avatar")
  async deleteAvatar(@CurrentUser() user: any, @Req() req: any) {
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.usersService.deleteAvatar(user.id, user.workspaceId, ip, ua);
  }

  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  @Post("me/signature")
  async uploadSignature(
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const result = uploadImageSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(", "),
      );
    }
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.usersService.uploadSignature(
      user.id,
      user.workspaceId,
      result.data,
      ip,
      ua,
    );
  }

  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  @Delete("me/signature")
  async deleteSignature(@CurrentUser() user: any, @Req() req: any) {
    const ip = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const ua = req.headers?.["user-agent"] || "Unknown";
    return this.usersService.deleteSignature(user.id, user.workspaceId, ip, ua);
  }
}

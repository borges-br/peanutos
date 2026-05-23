import {
  Controller,
  Get,
  Post,
  Patch,
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
import { userSchema } from "@peanut/validators";

@UseGuards(AuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles("OWNER", "ADMIN")
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
    const validationResult = userSchema.safeParse(body);
    if (!validationResult.success) {
      const messages = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.usersService.create(
      validationResult.data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN")
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const data: any = {};
    if (body.name) data.name = body.name;
    if (body.role) data.role = body.role;
    if (body.password) data.password = body.password;
    if (body.status) data.status = body.status;

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.usersService.update(
      id,
      data,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Roles("OWNER", "ADMIN")
  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() body: { status: "ACTIVE" | "INACTIVE" | "SUSPENDED" },
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    if (
      !body.status ||
      !["ACTIVE", "INACTIVE", "SUSPENDED"].includes(body.status)
    ) {
      throw new BadRequestException("Status inválido");
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.usersService.updateStatus(
      id,
      body.status,
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }
}

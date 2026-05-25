import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { loginSchema } from "@peanut/validators";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any, @Req() req: any) {
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      const messages = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.authService.login(validationResult.data, ipAddress, userAgent);
  }

  @UseGuards(AuthGuard)
  @Get("me")
  async me(@CurrentUser() user: any) {
    return {
      id: user.id,
      workspaceId: user.workspaceId,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarFileObjectId ? `/api/v1/files/${user.avatarFileObjectId}` : null,
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout() {
    return { success: true, message: "Logout realizado com sucesso" };
  }
}

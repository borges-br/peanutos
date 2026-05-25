import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { workspaceBrandSettingsSchema, uploadImageSchema } from "@peanut/validators";

@UseGuards(AuthGuard, RolesGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("brand")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async getBrandSettings(@CurrentUser() user: any) {
    return this.settingsService.getBrandSettings(user.workspaceId);
  }

  @Patch("brand")
  @Roles("OWNER", "ADMIN")
  async updateBrandSettings(
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validation = workspaceBrandSettingsSchema.safeParse(body);
    if (!validation.success) {
      const messages = validation.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.settingsService.updateBrandSettings(
      user.workspaceId,
      validation.data,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Post("brand/logo")
  @Roles("OWNER", "ADMIN")
  async uploadLogo(
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const validation = uploadImageSchema.safeParse(body);
    if (!validation.success) {
      const messages = validation.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.settingsService.uploadLogo(
      user.workspaceId,
      user.id,
      validation.data,
      ipAddress,
      userAgent,
    );
  }

  @Delete("brand/logo")
  @Roles("OWNER", "ADMIN")
  async deleteLogo(@CurrentUser() user: any, @Req() req: any) {
    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";
    return this.settingsService.deleteLogo(user.workspaceId, user.id, ipAddress, userAgent);
  }
}

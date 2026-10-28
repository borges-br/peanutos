import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
  Param,
  BadRequestException,
} from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import {
  workspaceBrandSettingsSchema,
  uploadImageSchema,
} from "@peanut/validators";

@UseGuards(AuthGuard, RolesGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('email')
  @Roles('OWNER', 'ADMIN')
  getEmail(@CurrentUser() user: any) { return this.settingsService.getEmailSettings(user.workspaceId); }

  @Patch('email')
  @Roles('OWNER', 'ADMIN')
  updateEmail(@CurrentUser() user: any, @Body() body: unknown) { return this.settingsService.updateEmailSettings(user.workspaceId, body, user.id); }

  @Post('email/test')
  @Roles('OWNER', 'ADMIN')
  testEmail(@CurrentUser() user: any) { return this.settingsService.testEmailConnection(user.workspaceId); }

  @Get('email/test/:id')
  @Roles('OWNER', 'ADMIN')
  emailTest(@CurrentUser() user: any, @Param('id') id: string) { return this.settingsService.getEmailTest(user.workspaceId, id); }

  @Get('operations')
  @Roles('OWNER', 'ADMIN')
  getOperations(@CurrentUser() user: any) { return this.settingsService.getOperationSettings(user.workspaceId); }

  @Patch('operations')
  @Roles('OWNER', 'ADMIN')
  updateOperations(@CurrentUser() user: any, @Body() body: unknown) { return this.settingsService.updateOperationSettings(user.workspaceId, body, user.id); }

  @Get("general")
  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN", "READ_ONLY")
  async getGeneralSettings(@CurrentUser() user: any) {
    return this.settingsService.getGeneralSettings(user.workspaceId);
  }

  @Patch("general")
  @Roles("OWNER", "ADMIN")
  async updateGeneralSettings(@Body() body: any, @CurrentUser() user: any, @Req() req: any) {
    return this.settingsService.updateGeneralSettings(user.workspaceId, body, user.id, req.ip, req.headers?.["user-agent"]);
  }

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
    return this.settingsService.deleteLogo(
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }
}

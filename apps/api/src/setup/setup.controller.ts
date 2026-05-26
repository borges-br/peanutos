import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { SetupService } from "./setup.service";
import { setupAdminSchema } from "@peanut/validators";

@Controller("setup")
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get("status")
  async getStatus() {
    return this.setupService.getStatus();
  }

  @Post("admin")
  async createAdmin(@Body() body: any, @Req() req: any) {
    const result = setupAdminSchema.safeParse(body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.setupService.createAdmin(result.data, ipAddress, userAgent);
  }
}

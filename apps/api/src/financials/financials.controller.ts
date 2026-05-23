import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { FinancialsService } from "./financials.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { billingScheduleQuerySchema } from "@peanut/validators";
import { BillingScheduleStatus } from "@peanut/db";

@UseGuards(AuthGuard, RolesGuard)
@Controller("financials")
@Roles("OWNER", "ADMIN", "FINANCIAL")
export class FinancialsController {
  constructor(private readonly financialsService: FinancialsService) {}

  @Get("mrr")
  async getMrr(@CurrentUser() user: any, @Req() req: any) {
    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.financialsService.getMrrMetrics(
      user.workspaceId,
      user.id,
      ipAddress,
      userAgent,
    );
  }

  @Get("billing-schedule")
  async getBillingSchedule(
    @Query("status") status: BillingScheduleStatus,
    @Query("contractId") contractId: string,
    @Query("clientId") clientId: string,
    @Query("page") page: number,
    @Query("limit") limit: number,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    // Validate inputs
    const parseResult = billingScheduleQuerySchema.safeParse({
      status,
      contractId,
      clientId,
    });

    if (!parseResult.success) {
      const messages = parseResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new BadRequestException(messages);
    }

    const ipAddress = req.ip || req.headers?.["x-forwarded-for"] || "127.0.0.1";
    const userAgent = req.headers?.["user-agent"] || "Unknown";

    return this.financialsService.getBillingSchedule(
      user.workspaceId,
      user.id,
      {
        status,
        contractId,
        clientId,
        page,
        limit,
      },
      ipAddress,
      userAgent,
    );
  }
}

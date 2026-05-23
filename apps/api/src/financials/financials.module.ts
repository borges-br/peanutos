import { Module } from "@nestjs/common";
import { FinancialsController } from "./financials.controller";
import { FinancialsService } from "./financials.service";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [FinancialsController],
  providers: [FinancialsService],
})
export class FinancialsModule {}

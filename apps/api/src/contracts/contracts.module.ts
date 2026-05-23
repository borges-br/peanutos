import { Module } from "@nestjs/common";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";
import { ContractsQuotaService } from "./contracts-quota.service";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [ContractsController],
  providers: [ContractsService, ContractsQuotaService],
  exports: [ContractsService, ContractsQuotaService],
})
export class ContractsModule {}

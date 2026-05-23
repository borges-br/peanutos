import { Module } from "@nestjs/common";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { AuditModule } from "../audit/audit.module";
import { ContractsModule } from "../contracts/contracts.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuditModule, AuthModule, ContractsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

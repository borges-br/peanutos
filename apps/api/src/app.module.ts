import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ClientsModule } from "./clients/clients.module";
import { ClientUsersModule } from "./client-users/client-users.module";
import { InventoryModule } from "./inventory/inventory.module";
import { TicketsModule } from "./tickets/tickets.module";
import { ContractsModule } from "./contracts/contracts.module";
import { FinancialsModule } from "./financials/financials.module";

@Module({
  imports: [
    AuditModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    ClientUsersModule,
    InventoryModule,
    TicketsModule,
    ContractsModule,
    FinancialsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

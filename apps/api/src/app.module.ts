import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ClientsModule } from "./clients/clients.module";
import { ClientUsersModule } from "./client-users/client-users.module";
import { InventoryModule } from "./inventory/inventory.module";

@Module({
  imports: [
    AuditModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    ClientUsersModule,
    InventoryModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

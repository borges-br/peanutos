import { Module } from "@nestjs/common";
import { ClientUsersController } from "./client-users.controller";
import { ClientUsersService } from "./client-users.service";
import { AuditModule } from "../audit/audit.module";
import { ContractsModule } from "../contracts/contracts.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuditModule, AuthModule, ContractsModule],
  controllers: [ClientUsersController],
  providers: [ClientUsersService],
  exports: [ClientUsersService],
})
export class ClientUsersModule {}

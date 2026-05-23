import { Module } from "@nestjs/common";
import { ClientUsersController } from "./client-users.controller";
import { ClientUsersService } from "./client-users.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [ClientUsersController],
  providers: [ClientUsersService],
  exports: [ClientUsersService],
})
export class ClientUsersModule {}

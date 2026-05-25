import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [AuthModule, AuditModule, StorageModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

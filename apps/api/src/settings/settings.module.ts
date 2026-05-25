import { Module } from "@nestjs/common";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [AuthModule, AuditModule, StorageModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

import { Module } from "@nestjs/common";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { StorageModule } from "../storage/storage.module";
import { VisualSettingsService } from './visual-settings.service';
import { VisualSettingsController } from './visual-settings.controller';

@Module({
  imports: [AuthModule, AuditModule, StorageModule],
  controllers: [SettingsController, VisualSettingsController],
  providers: [SettingsService, VisualSettingsService],
  exports: [SettingsService, VisualSettingsService],
})
export class SettingsModule {}

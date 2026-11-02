import { Module } from "@nestjs/common";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { StorageModule } from "../storage/storage.module";
import { VisualSettingsService } from './visual-settings.service';
import { VisualSettingsController } from './visual-settings.controller';
import { PublicBrandController } from './public-brand.controller';
import { PublicBrandService } from './public-brand.service';

@Module({
  imports: [AuthModule, AuditModule, StorageModule],
  controllers: [SettingsController, VisualSettingsController, PublicBrandController],
  providers: [SettingsService, VisualSettingsService, PublicBrandService],
  exports: [SettingsService, VisualSettingsService],
})
export class SettingsModule {}

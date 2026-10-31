import { Module } from "@nestjs/common";
import { DocumentTemplatesController } from "./document-templates.controller";
import { DocumentTemplatesService } from "./document-templates.service";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import {SettingsModule} from '../settings/settings.module';

@Module({
  imports: [AuthModule, AuditModule, SettingsModule],
  controllers: [DocumentTemplatesController],
  providers: [DocumentTemplatesService],
  exports: [DocumentTemplatesService],
})
export class DocumentTemplatesModule {}

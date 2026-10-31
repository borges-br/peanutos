import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import {AuthoredDocumentsController} from './authored-documents.controller';
import {AuthoredDocumentsService} from './authored-documents.service';
import {SettingsModule} from '../settings/settings.module';

@Module({
  imports: [AuthModule, AuditModule, SettingsModule],
  controllers: [DocumentsController,AuthoredDocumentsController],
  providers: [DocumentsService,AuthoredDocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}

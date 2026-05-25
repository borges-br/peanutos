import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { SetupModule } from "./setup/setup.module";
import { UsersModule } from "./users/users.module";
import { ClientsModule } from "./clients/clients.module";
import { ClientUsersModule } from "./client-users/client-users.module";
import { InventoryModule } from "./inventory/inventory.module";
import { TicketsModule } from "./tickets/tickets.module";
import { ContractsModule } from "./contracts/contracts.module";
import { FinancialsModule } from "./financials/financials.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { SettingsModule } from "./settings/settings.module";
import { DocumentsModule } from "./documents/documents.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { FilesModule } from "./files/files.module";
import { DocumentTemplatesModule } from "./document-templates/document-templates.module";

@Module({
  imports: [
    AuditModule,
    AuthModule,
    WebhooksModule,
    SetupModule,
    UsersModule,
    ClientsModule,
    ClientUsersModule,
    InventoryModule,
    TicketsModule,
    ContractsModule,
    FinancialsModule,
    InvoicesModule,
    SettingsModule,
    DocumentsModule,
    FilesModule,
    DocumentTemplatesModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

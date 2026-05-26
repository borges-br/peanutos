import { Module, Global } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";
import { InboundController } from "./inbound.controller";
import { WebhooksService } from "./webhooks.service";
import { WebhookEventsService } from "./webhook-events.service";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";

@Global()
@Module({
  imports: [AuditModule, AuthModule],
  controllers: [WebhooksController, InboundController],
  providers: [WebhooksService, WebhookEventsService],
  exports: [WebhookEventsService],
})
export class WebhooksModule {}

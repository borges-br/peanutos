import { Module } from "@nestjs/common";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
import { SlaService } from "./sla.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [TicketsController],
  providers: [TicketsService, SlaService],
  exports: [TicketsService],
})
export class TicketsModule {}

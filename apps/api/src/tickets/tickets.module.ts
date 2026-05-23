import { Module } from "@nestjs/common";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
import { SlaService } from "./sla.service";

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, SlaService],
  exports: [TicketsService],
})
export class TicketsModule {}

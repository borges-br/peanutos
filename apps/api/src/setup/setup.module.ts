import { Module } from "@nestjs/common";
import { SetupController } from "./setup.controller";
import { SetupService } from "./setup.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}

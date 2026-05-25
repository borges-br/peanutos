import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { AuthModule } from "../auth/auth.module";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [FilesController],
})
export class FilesModule {}

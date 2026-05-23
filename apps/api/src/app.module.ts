import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    UsersModule,
    ClientsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}


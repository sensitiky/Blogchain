import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { UsersController } from './users.controller';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [UsersController],
})
export class AppModule {}

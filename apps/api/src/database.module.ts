import { Module } from '@nestjs/common';
import { DATABASE_POOL, databaseProvider } from './database.provider.js';

@Module({
  providers: [databaseProvider],
  exports: [DATABASE_POOL]
})
export class DatabaseModule {}

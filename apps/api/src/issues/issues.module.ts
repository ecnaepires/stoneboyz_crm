import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module.js';
import { IssuesController } from './issues.controller.js';
import { IssuesRepository } from './issues.repository.js';
import { IssuesService } from './issues.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [IssuesController],
  providers: [IssuesRepository, IssuesService]
})
export class IssuesModule {}

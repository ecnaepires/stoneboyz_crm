import { Module } from '@nestjs/common';
import { databaseProvider } from '../database.provider.js';
import { QuoteNotesController } from './quote-notes.controller.js';
import { QuoteNotesRepository } from './quote-notes.repository.js';
import { QuoteNotesService } from './quote-notes.service.js';

@Module({
  controllers: [QuoteNotesController],
  providers: [databaseProvider, QuoteNotesRepository, QuoteNotesService]
})
export class QuoteNotesModule {}

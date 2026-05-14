import { Logger, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBus } from './event-bus.js';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [EventBus, Logger],
  exports: [EventBus]
})
export class EventsModule {}

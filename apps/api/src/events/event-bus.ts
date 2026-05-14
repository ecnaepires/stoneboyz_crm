import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { EventEnvelope } from './event-types.js';

@Injectable()
export class EventBus {
  private readonly fallbackLogger = new Logger(EventBus.name);

  constructor(
    private readonly emitter: EventEmitter2,
    @Optional() private readonly logger?: Logger
  ) {}

  emit<TData>(eventName: string, data: TData, version = 1): void {
    const envelope: EventEnvelope<TData> = {
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      version,
      data
    };

    try {
      this.emitter.emit(eventName, envelope);
    } catch (error) {
      const activeLogger = this.logger ?? this.fallbackLogger;
      activeLogger.error(`Failed to emit event ${eventName}`, error instanceof Error ? error.stack : String(error));
    }
  }
}

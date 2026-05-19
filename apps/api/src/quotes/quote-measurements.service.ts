import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CounterPiece,
  CreateCounterPieceInput,
  CreateEdgeSegmentInput,
  CreateSinkCutoutInput,
  EdgeSegment,
  SinkCutout,
  TransitionQuoteInput,
  UpdateCounterPieceInput,
  UpdateEdgeSegmentInput,
  UpdateSinkCutoutInput
} from '@stoneboyz/domain';
import { EventBus } from '../events/event-bus.js';
import { buildQuoteMeasurementPayload, buildQuoteMeasurementUpdatedPayload } from './quote-measurement-events.js';
import { QuoteAreasRepository } from './quote-areas.repository.js';
import { QuoteMeasurementsRepository } from './quote-measurements.repository.js';
import { QuotesRepository } from './quotes.repository.js';

type MeasurementKind = 'counter_piece' | 'edge_segment' | 'sink_cutout';

@Injectable()
export class QuoteMeasurementsService {
  constructor(
    private readonly quotesRepository: QuotesRepository,
    private readonly quoteAreasRepository: QuoteAreasRepository,
    private readonly quoteMeasurementsRepository: QuoteMeasurementsRepository,
    private readonly eventBus: EventBus
  ) {}

  async listPieces(customerId: string, quoteId: string, areaId: string): Promise<{ data: CounterPiece[] }> {
    await this.ensureAreaExists(customerId, quoteId, areaId);

    return { data: await this.quoteMeasurementsRepository.listPieces(areaId) };
  }

  async createPiece(customerId: string, quoteId: string, areaId: string, input: CreateCounterPieceInput): Promise<CounterPiece> {
    await this.ensureDraftArea(customerId, quoteId, areaId);
    const piece = await this.quoteMeasurementsRepository.createPiece(areaId, input);

    this.emitChanged('counter_piece', 'added', customerId, quoteId, areaId, piece.id, input.actorUserId);

    return piece;
  }

  async updatePiece(
    customerId: string,
    quoteId: string,
    areaId: string,
    pieceId: string,
    input: UpdateCounterPieceInput
  ): Promise<CounterPiece> {
    await this.ensureDraftArea(customerId, quoteId, areaId);
    const piece = await this.quoteMeasurementsRepository.updatePiece(areaId, pieceId, input);

    if (piece === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Counter piece not found' });
    }

    this.emitUpdated('counter_piece', customerId, quoteId, areaId, pieceId, input.actorUserId, changedFields(input));

    return piece;
  }

  async removePiece(
    customerId: string,
    quoteId: string,
    areaId: string,
    pieceId: string,
    input: TransitionQuoteInput
  ): Promise<CounterPiece> {
    await this.ensureDraftArea(customerId, quoteId, areaId);
    const piece = await this.quoteMeasurementsRepository.removePiece(areaId, pieceId);

    if (piece === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Counter piece not found' });
    }

    this.emitChanged('counter_piece', 'removed', customerId, quoteId, areaId, pieceId, input.actorUserId);

    return piece;
  }

  async listEdges(customerId: string, quoteId: string, areaId: string): Promise<{ data: EdgeSegment[] }> {
    await this.ensureAreaExists(customerId, quoteId, areaId);

    return { data: await this.quoteMeasurementsRepository.listEdges(areaId) };
  }

  async createEdge(customerId: string, quoteId: string, areaId: string, input: CreateEdgeSegmentInput): Promise<EdgeSegment> {
    await this.ensureDraftArea(customerId, quoteId, areaId);
    const edge = await this.quoteMeasurementsRepository.createEdge(areaId, input);

    this.emitChanged('edge_segment', 'added', customerId, quoteId, areaId, edge.id, input.actorUserId);

    return edge;
  }

  async updateEdge(
    customerId: string,
    quoteId: string,
    areaId: string,
    edgeId: string,
    input: UpdateEdgeSegmentInput
  ): Promise<EdgeSegment> {
    await this.ensureDraftArea(customerId, quoteId, areaId);
    const edge = await this.quoteMeasurementsRepository.updateEdge(areaId, edgeId, input);

    if (edge === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Edge segment not found' });
    }

    this.emitUpdated('edge_segment', customerId, quoteId, areaId, edgeId, input.actorUserId, changedFields(input));

    return edge;
  }

  async removeEdge(
    customerId: string,
    quoteId: string,
    areaId: string,
    edgeId: string,
    input: TransitionQuoteInput
  ): Promise<EdgeSegment> {
    await this.ensureDraftArea(customerId, quoteId, areaId);
    const edge = await this.quoteMeasurementsRepository.removeEdge(areaId, edgeId);

    if (edge === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Edge segment not found' });
    }

    this.emitChanged('edge_segment', 'removed', customerId, quoteId, areaId, edgeId, input.actorUserId);

    return edge;
  }

  async listSinks(customerId: string, quoteId: string, areaId: string): Promise<{ data: SinkCutout[] }> {
    await this.ensureAreaExists(customerId, quoteId, areaId);

    return { data: await this.quoteMeasurementsRepository.listSinks(areaId) };
  }

  async createSink(customerId: string, quoteId: string, areaId: string, input: CreateSinkCutoutInput): Promise<SinkCutout> {
    await this.ensureDraftArea(customerId, quoteId, areaId);
    const sink = await this.quoteMeasurementsRepository.createSink(areaId, input);

    this.emitChanged('sink_cutout', 'added', customerId, quoteId, areaId, sink.id, input.actorUserId);

    return sink;
  }

  async updateSink(
    customerId: string,
    quoteId: string,
    areaId: string,
    sinkId: string,
    input: UpdateSinkCutoutInput
  ): Promise<SinkCutout> {
    await this.ensureDraftArea(customerId, quoteId, areaId);
    const sink = await this.quoteMeasurementsRepository.updateSink(areaId, sinkId, input);

    if (sink === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Sink cutout not found' });
    }

    this.emitUpdated('sink_cutout', customerId, quoteId, areaId, sinkId, input.actorUserId, changedFields(input));

    return sink;
  }

  async removeSink(
    customerId: string,
    quoteId: string,
    areaId: string,
    sinkId: string,
    input: TransitionQuoteInput
  ): Promise<SinkCutout> {
    await this.ensureDraftArea(customerId, quoteId, areaId);
    const sink = await this.quoteMeasurementsRepository.removeSink(areaId, sinkId);

    if (sink === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Sink cutout not found' });
    }

    this.emitChanged('sink_cutout', 'removed', customerId, quoteId, areaId, sinkId, input.actorUserId);

    return sink;
  }

  private async ensureDraftArea(customerId: string, quoteId: string, areaId: string): Promise<void> {
    const quote = await this.ensureAreaExists(customerId, quoteId, areaId);

    if (quote.status !== 'draft') {
      throw new ConflictException({ code: 'INVALID_QUOTE_STATUS', message: 'Quote is not in draft status' });
    }
  }

  private async ensureAreaExists(customerId: string, quoteId: string, areaId: string) {
    const quote = await this.quotesRepository.findById(customerId, quoteId);

    if (quote === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote not found' });
    }

    const area = await this.quoteAreasRepository.findById(quoteId, areaId);

    if (area === null) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Quote area not found' });
    }

    return quote;
  }

  private emitChanged(
    kind: MeasurementKind,
    action: 'added' | 'removed',
    customerId: string,
    quoteId: string,
    areaId: string,
    measurementId: string,
    actorUserId: string
  ): void {
    this.eventBus.emit(
      `quote.${kind}_${action}`,
      buildQuoteMeasurementPayload(customerId, quoteId, areaId, measurementId, actorUserId)
    );
  }

  private emitUpdated(
    kind: MeasurementKind,
    customerId: string,
    quoteId: string,
    areaId: string,
    measurementId: string,
    actorUserId: string,
    fields: string[]
  ): void {
    this.eventBus.emit(
      `quote.${kind}_updated`,
      buildQuoteMeasurementUpdatedPayload(customerId, quoteId, areaId, measurementId, actorUserId, fields)
    );
  }
}

const changedFields = (input: { actorUserId: string }): string[] => Object.keys(input).filter((key) => key !== 'actorUserId');

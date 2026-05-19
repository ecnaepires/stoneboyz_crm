import type React from 'react';
import type { components } from '@stoneboyz/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { getApiClientWithAuth } from '@/lib/api';
import {
  createCounterPieceAction,
  createEdgeSegmentAction,
  createSinkCutoutAction,
  deleteCounterPieceAction,
  deleteEdgeSegmentAction,
  deleteSinkCutoutAction,
  updateCounterPieceAction,
  updateEdgeSegmentAction,
  updateSinkCutoutAction,
} from '../_actions';

type QuoteArea = components['schemas']['QuoteArea'];
type EdgeTreatment = 'unfinished' | 'finished' | 'appliance' | 'mitered' | 'waterfall';
type SinkType = 'undermount' | 'drop_in' | 'farm';
type SinkShape = 'rectangle' | 'oval' | 'double' | '60_40' | '40_60' | '70_30' | '30_70';
type SinkCenterline = 'none' | 'left' | 'right' | 'center';

type QuoteMeasurementAreaTotals = {
  pieceCount: number;
  countertopSqFt: number;
  finishedEdgeLinFt: number;
  splashSqFt: number;
  sinkCutoutCount: number;
  faucetHoleCount: number;
};

export type QuoteAreaWithMeasurementTotals = QuoteArea & {
  measurementTotals: QuoteMeasurementAreaTotals;
};

type CounterPiece = {
  id: string;
  quoteAreaId: string;
  sortOrder: number;
  name: string | null;
  lengthIn: number;
  widthIn: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

type EdgeSegment = {
  id: string;
  quoteAreaId: string;
  sortOrder: number;
  lengthIn: number;
  treatment: EdgeTreatment;
  splashHeightIn: number | null;
  createdAt: string;
  updatedAt: string;
};

type SinkCutout = {
  id: string;
  quoteAreaId: string;
  sortOrder: number;
  quantity: number;
  model: string | null;
  sinkType: SinkType;
  shape: SinkShape;
  cutoutLengthIn: number;
  cutoutWidthIn: number;
  faucetHoleCount: number;
  centerline: SinkCenterline;
  createdAt: string;
  updatedAt: string;
};

type MeasurementReadClient = {
  GET: <T>(
    path: string,
    options: { params: { path: Record<string, string> } }
  ) => Promise<{ data?: { data: T[] }; error?: unknown }>;
};

type MeasurementApiResult<T> = { data?: { data: T[] }; error?: unknown };

interface MeasurementsCardProps {
  customerId: string;
  quoteId: string;
  areas: QuoteAreaWithMeasurementTotals[];
  isDraft: boolean;
}

const edgeTreatments: EdgeTreatment[] = ['unfinished', 'finished', 'appliance', 'mitered', 'waterfall'];
const sinkTypes: SinkType[] = ['undermount', 'drop_in', 'farm'];
const sinkShapes: SinkShape[] = ['rectangle', 'oval', 'double', '60_40', '40_60', '70_30', '30_70'];
const sinkCenterlines: SinkCenterline[] = ['none', 'left', 'right', 'center'];
const emptyMeasurementTotals: QuoteMeasurementAreaTotals = {
  pieceCount: 0,
  countertopSqFt: 0,
  finishedEdgeLinFt: 0,
  splashSqFt: 0,
  sinkCutoutCount: 0,
  faucetHoleCount: 0,
};

const formatLabel = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const measurementNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

function getErrorStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const withStatus = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof withStatus.status === 'number') {
    return withStatus.status;
  }
  if (typeof withStatus.response?.status === 'number') {
    return withStatus.response.status;
  }

  return undefined;
}

async function getAreaMeasurements(customerId: string, quoteId: string, areaId: string) {
  const client = (await getApiClientWithAuth()) as unknown as MeasurementReadClient;
  const [piecesRes, edgesRes, sinksRes] = await Promise.all([
    client.GET<CounterPiece>('/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/pieces', {
      params: { path: { customerId, quoteId, areaId } },
    }),
    client.GET<EdgeSegment>('/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/edges', {
      params: { path: { customerId, quoteId, areaId } },
    }),
    client.GET<SinkCutout>('/customers/{customerId}/quotes/{quoteId}/areas/{areaId}/sinks', {
      params: { path: { customerId, quoteId, areaId } },
    }),
  ]);

  const results = {
    pieces: piecesRes as MeasurementApiResult<CounterPiece>,
    edges: edgesRes as MeasurementApiResult<EdgeSegment>,
    sinks: sinksRes as MeasurementApiResult<SinkCutout>,
  };

  const failures = (Object.entries(results) as Array<[keyof typeof results, MeasurementApiResult<unknown>]>)
    .filter(([, res]) => Boolean(res.error))
    .map(([segment, res]) => ({
      segment,
      status: getErrorStatusCode(res.error),
      error: res.error,
    }));

  if (failures.some((failure) => failure.status === 401 || failure.status === 403)) {
    throw new Error('Failed to authorize area measurements request');
  }

  if (failures.length > 0) {
    console.error('Partial failure loading area measurements', {
      customerId,
      quoteId,
      areaId,
      failures,
    });
  }

  return {
    pieces: piecesRes.data?.data ?? [],
    edges: edgesRes.data?.data ?? [],
    sinks: sinksRes.data?.data ?? [],
  };
}

function TotalsGrid({ area }: { area: QuoteAreaWithMeasurementTotals }) {
  const totals = area.measurementTotals ?? emptyMeasurementTotals;

  return (
    <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3 lg:grid-cols-6">
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Countertop</dt>
        <dd className="font-medium">{measurementNumber(totals.countertopSqFt)} sq ft</dd>
      </div>
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Finished Edge</dt>
        <dd className="font-medium">{measurementNumber(totals.finishedEdgeLinFt)} lin ft</dd>
      </div>
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Splash</dt>
        <dd className="font-medium">{measurementNumber(totals.splashSqFt)} sq ft</dd>
      </div>
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Pieces</dt>
        <dd className="font-medium">{measurementNumber(totals.pieceCount)}</dd>
      </div>
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Sinks</dt>
        <dd className="font-medium">{measurementNumber(totals.sinkCutoutCount)}</dd>
      </div>
      <div className="rounded-md border p-2">
        <dt className="text-xs text-muted-foreground">Faucet Holes</dt>
        <dd className="font-medium">{measurementNumber(totals.faucetHoleCount)}</dd>
      </div>
    </dl>
  );
}

function Field({
  id,
  label,
  children,
  className = '',
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function CounterPieceForm({
  formId,
  action,
  buttonLabel,
  piece,
}: {
  formId: string;
  action: (formData: FormData) => void | Promise<void>;
  buttonLabel: string;
  piece?: CounterPiece;
}) {
  return (
    <form action={action} className="rounded-md border p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Field id={`${formId}-name`} label="Name">
          <Input id={`${formId}-name`} name="name" defaultValue={piece?.name ?? ''} />
        </Field>
        <Field id={`${formId}-length`} label="Length In *">
          <Input
            id={`${formId}-length`}
            name="lengthIn"
            type="number"
            min="0.001"
            step="0.001"
            defaultValue={piece?.lengthIn}
            required
          />
        </Field>
        <Field id={`${formId}-width`} label="Width In *">
          <Input
            id={`${formId}-width`}
            name="widthIn"
            type="number"
            min="0.001"
            step="0.001"
            defaultValue={piece?.widthIn}
            required
          />
        </Field>
        <Field id={`${formId}-quantity`} label="Qty *">
          <Input
            id={`${formId}-quantity`}
            name="quantity"
            type="number"
            min="1"
            step="1"
            defaultValue={piece?.quantity ?? 1}
            required
          />
        </Field>
        <Field id={`${formId}-sort`} label="Sort">
          <Input id={`${formId}-sort`} name="sortOrder" type="number" defaultValue={piece?.sortOrder ?? 0} />
        </Field>
      </div>
      <Button type="submit" size="sm" className="mt-3">
        {buttonLabel}
      </Button>
    </form>
  );
}

function EdgeSegmentForm({
  formId,
  action,
  buttonLabel,
  edge,
}: {
  formId: string;
  action: (formData: FormData) => void | Promise<void>;
  buttonLabel: string;
  edge?: EdgeSegment;
}) {
  return (
    <form action={action} className="rounded-md border p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Field id={`${formId}-length`} label="Length In *">
          <Input
            id={`${formId}-length`}
            name="lengthIn"
            type="number"
            min="0.001"
            step="0.001"
            defaultValue={edge?.lengthIn}
            required
          />
        </Field>
        <Field id={`${formId}-treatment`} label="Treatment *">
          <Select id={`${formId}-treatment`} name="treatment" defaultValue={edge?.treatment ?? 'finished'} required>
            {edgeTreatments.map((treatment) => (
              <option key={treatment} value={treatment}>
                {formatLabel(treatment)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${formId}-splash`} label="Splash Height In">
          <Input
            id={`${formId}-splash`}
            name="splashHeightIn"
            type="number"
            min="0.001"
            step="0.001"
            defaultValue={edge?.splashHeightIn ?? ''}
          />
        </Field>
        <Field id={`${formId}-sort`} label="Sort">
          <Input id={`${formId}-sort`} name="sortOrder" type="number" defaultValue={edge?.sortOrder ?? 0} />
        </Field>
      </div>
      <Button type="submit" size="sm" className="mt-3">
        {buttonLabel}
      </Button>
    </form>
  );
}

function SinkCutoutForm({
  formId,
  action,
  buttonLabel,
  sink,
}: {
  formId: string;
  action: (formData: FormData) => void | Promise<void>;
  buttonLabel: string;
  sink?: SinkCutout;
}) {
  return (
    <form action={action} className="rounded-md border p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Field id={`${formId}-quantity`} label="Qty *">
          <Input
            id={`${formId}-quantity`}
            name="quantity"
            type="number"
            min="1"
            step="1"
            defaultValue={sink?.quantity ?? 1}
            required
          />
        </Field>
        <Field id={`${formId}-model`} label="Model">
          <Input id={`${formId}-model`} name="model" defaultValue={sink?.model ?? ''} />
        </Field>
        <Field id={`${formId}-type`} label="Sink Type *">
          <Select id={`${formId}-type`} name="sinkType" defaultValue={sink?.sinkType ?? 'undermount'} required>
            {sinkTypes.map((sinkType) => (
              <option key={sinkType} value={sinkType}>
                {formatLabel(sinkType)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${formId}-shape`} label="Shape *">
          <Select id={`${formId}-shape`} name="shape" defaultValue={sink?.shape ?? 'rectangle'} required>
            {sinkShapes.map((shape) => (
              <option key={shape} value={shape}>
                {formatLabel(shape)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${formId}-length`} label="Cutout Length In *">
          <Input
            id={`${formId}-length`}
            name="cutoutLengthIn"
            type="number"
            min="0.001"
            step="0.001"
            defaultValue={sink?.cutoutLengthIn}
            required
          />
        </Field>
        <Field id={`${formId}-width`} label="Cutout Width In *">
          <Input
            id={`${formId}-width`}
            name="cutoutWidthIn"
            type="number"
            min="0.001"
            step="0.001"
            defaultValue={sink?.cutoutWidthIn}
            required
          />
        </Field>
        <Field id={`${formId}-holes`} label="Faucet Holes *">
          <Input
            id={`${formId}-holes`}
            name="faucetHoleCount"
            type="number"
            min="0"
            max="5"
            step="1"
            defaultValue={sink?.faucetHoleCount ?? 0}
            required
          />
        </Field>
        <Field id={`${formId}-centerline`} label="Centerline *">
          <Select id={`${formId}-centerline`} name="centerline" defaultValue={sink?.centerline ?? 'none'} required>
            {sinkCenterlines.map((centerline) => (
              <option key={centerline} value={centerline}>
                {formatLabel(centerline)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${formId}-sort`} label="Sort">
          <Input id={`${formId}-sort`} name="sortOrder" type="number" defaultValue={sink?.sortOrder ?? 0} />
        </Field>
      </div>
      <Button type="submit" size="sm" className="mt-3">
        {buttonLabel}
      </Button>
    </form>
  );
}

function ReadOnlyMeasurements({
  pieces,
  edges,
  sinks,
}: {
  pieces: CounterPiece[];
  edges: EdgeSegment[];
  sinks: SinkCutout[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <MeasurementList title="Pieces" empty="No pieces." items={pieces.map((piece) => (
        <span key={piece.id}>
          {piece.name ?? 'Piece'}: {measurementNumber(piece.lengthIn)} x {measurementNumber(piece.widthIn)} in, qty{' '}
          {piece.quantity}
        </span>
      ))} />
      <MeasurementList title="Edges" empty="No edges." items={edges.map((edge) => (
        <span key={edge.id}>
          {measurementNumber(edge.lengthIn)} in {formatLabel(edge.treatment)}
          {edge.splashHeightIn ? `, ${measurementNumber(edge.splashHeightIn)} in splash` : ''}
        </span>
      ))} />
      <MeasurementList title="Sinks" empty="No sinks." items={sinks.map((sink) => (
        <span key={sink.id}>
          {sink.quantity} {formatLabel(sink.sinkType)} {formatLabel(sink.shape)}
          {sink.model ? `, ${sink.model}` : ''}, {sink.faucetHoleCount} holes
        </span>
      ))} />
    </div>
  );
}

function MeasurementList({ title, empty, items }: { title: string; empty: string; items: React.ReactNode[] }) {
  return (
    <div className="rounded-md border p-3 text-sm">
      <h4 className="mb-2 font-medium">{title}</h4>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export async function MeasurementsCard({ customerId, quoteId, areas, isDraft }: MeasurementsCardProps) {
  const measurementsByArea = new Map(
    await Promise.all(
      areas.map(async (area) => [area.id, await getAreaMeasurements(customerId, quoteId, area.id)] as const)
    )
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Measurements</CardTitle>
      </CardHeader>
      <CardContent>
        {areas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add an area before entering measurements.</p>
        ) : (
          <div className="space-y-4">
            {areas.map((area) => {
              const measurements = measurementsByArea.get(area.id) ?? { pieces: [], edges: [], sinks: [] };

              return (
                <section key={area.id} className="space-y-4 rounded-md border p-3">
                  <div>
                    <h3 className="font-medium">{area.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {[area.material, area.color, area.edgeProfile].filter(Boolean).join(' - ') || 'No area details'}
                    </p>
                  </div>

                  <TotalsGrid area={area} />

                  {isDraft ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Counter Pieces ({measurements.pieces.length})</h4>
                        {measurements.pieces.map((piece) => (
                          <div key={piece.id} className="space-y-2">
                            <CounterPieceForm
                              formId={`piece-${piece.id}`}
                              action={updateCounterPieceAction.bind(null, customerId, quoteId, area.id, piece.id)}
                              buttonLabel="Save Piece"
                              piece={piece}
                            />
                            <form action={deleteCounterPieceAction.bind(null, customerId, quoteId, area.id, piece.id)}>
                              <Button type="submit" variant="ghost" size="sm">
                                Delete Piece
                              </Button>
                            </form>
                          </div>
                        ))}
                        <CounterPieceForm
                          formId={`piece-new-${area.id}`}
                          action={createCounterPieceAction.bind(null, customerId, quoteId, area.id)}
                          buttonLabel="Add Piece"
                        />
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Edge Segments ({measurements.edges.length})</h4>
                        {measurements.edges.map((edge) => (
                          <div key={edge.id} className="space-y-2">
                            <EdgeSegmentForm
                              formId={`edge-${edge.id}`}
                              action={updateEdgeSegmentAction.bind(null, customerId, quoteId, area.id, edge.id)}
                              buttonLabel="Save Edge"
                              edge={edge}
                            />
                            <form action={deleteEdgeSegmentAction.bind(null, customerId, quoteId, area.id, edge.id)}>
                              <Button type="submit" variant="ghost" size="sm">
                                Delete Edge
                              </Button>
                            </form>
                          </div>
                        ))}
                        <EdgeSegmentForm
                          formId={`edge-new-${area.id}`}
                          action={createEdgeSegmentAction.bind(null, customerId, quoteId, area.id)}
                          buttonLabel="Add Edge"
                        />
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Sink Cutouts ({measurements.sinks.length})</h4>
                        {measurements.sinks.map((sink) => (
                          <div key={sink.id} className="space-y-2">
                            <SinkCutoutForm
                              formId={`sink-${sink.id}`}
                              action={updateSinkCutoutAction.bind(null, customerId, quoteId, area.id, sink.id)}
                              buttonLabel="Save Sink"
                              sink={sink}
                            />
                            <form action={deleteSinkCutoutAction.bind(null, customerId, quoteId, area.id, sink.id)}>
                              <Button type="submit" variant="ghost" size="sm">
                                Delete Sink
                              </Button>
                            </form>
                          </div>
                        ))}
                        <SinkCutoutForm
                          formId={`sink-new-${area.id}`}
                          action={createSinkCutoutAction.bind(null, customerId, quoteId, area.id)}
                          buttonLabel="Add Sink"
                        />
                      </div>
                    </div>
                  ) : (
                    <ReadOnlyMeasurements
                      pieces={measurements.pieces}
                      edges={measurements.edges}
                      sinks={measurements.sinks}
                    />
                  )}
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

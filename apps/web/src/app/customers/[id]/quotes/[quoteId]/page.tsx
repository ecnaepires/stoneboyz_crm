import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { components } from '@stoneboyz/api-client';
import { getApiClientWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  acceptQuoteAction,
  addLineItemAction,
  archiveQuoteAction,
  createAreaAction,
  deleteAreaAction,
  deleteLineItemAction,
  rejectQuoteAction,
  sendQuoteEmailAction,
  sendQuoteAction,
} from '../_actions';
import { addQuoteNoteAction, deleteQuoteNoteAction } from './_actions';
import { convertQuoteToOrderAction } from '../../orders/_actions';
import { CopyLinkButton } from './CopyLinkButton';
import { MeasurementsCard } from './MeasurementsCard';
import type { QuoteAreaWithMeasurementTotals } from './MeasurementsCard';
import { PricingCard } from './PricingCard';

type QuoteLineItem = components['schemas']['QuoteLineItem'] & {
  lengthIn?: number | null;
  widthIn?: number | null;
  thicknessCm?: number | null;
  sqFt?: number | null;
};
type QuoteArea = components['schemas']['QuoteArea'];

interface QuoteNote {
  id: string;
  authorUserId: string;
  body: string;
  isPublic: boolean;
  createdAt: string;
}

type NotesQueryClient = {
  GET: (
    path: '/customers/{customerId}/quotes/{quoteId}/notes',
    options: { params: { path: { customerId: string; quoteId: string } } }
  ) => Promise<{ data?: QuoteNote[]; error?: unknown }>;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const dimensions = (lineItem: QuoteLineItem) => {
  const length = lineItem.lengthIn ?? '-';
  const width = lineItem.widthIn ?? '-';
  const thickness = lineItem.thicknessCm ?? '-';
  return `${length} x ${width} x ${thickness}`;
};

const areaDetails = (area: QuoteArea) =>
  [area.material, area.color, area.edgeProfile].filter(Boolean).join(' · ') || '-';

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string; quoteId: string }>;
}) {
  const { id: customerId, quoteId } = await params;
  const client = await getApiClientWithAuth();

  const [{ data: quote, error }, { data: customer }, { data: notesRes }, { data: usersRes }] = await Promise.all([
    client.GET('/customers/{customerId}/quotes/{quoteId}', {
      params: { path: { customerId, quoteId } },
    }),
    client.GET('/customers/{customerId}', { params: { path: { customerId } } }),
    (client as unknown as NotesQueryClient).GET('/customers/{customerId}/quotes/{quoteId}/notes', {
      params: { path: { customerId, quoteId } },
    }),
    client.GET('/users', {}),
  ]);

  if (error || !quote) {
    notFound();
  }

  const { data: project } = quote.projectId
    ? await client.GET('/projects/{projectId}', { params: { path: { projectId: quote.projectId } } })
    : { data: null };
  const { data: priceList } = quote.priceListId
    ? await client.GET('/price-lists/{priceListId}', {
        params: { path: { priceListId: quote.priceListId } },
      })
    : { data: null };

  const isDraft = quote.status === 'draft';
  const hasPriceList = quote.priceListId !== null;
  const sendWithIds = sendQuoteAction.bind(null, customerId, quoteId);
  const sendEmailWithIds = sendQuoteEmailAction.bind(null, customerId, quoteId);
  const acceptWithIds = acceptQuoteAction.bind(null, customerId, quoteId);
  const rejectWithIds = rejectQuoteAction.bind(null, customerId, quoteId);
  const archiveWithIds = archiveQuoteAction.bind(null, customerId, quoteId);
  const addLineItemWithIds = addLineItemAction.bind(null, customerId, quoteId);
  const createAreaWithIds = createAreaAction.bind(null, customerId, quoteId);
  const convertToOrderWithIds = convertQuoteToOrderAction.bind(null, customerId, quoteId);
  const addNoteWithIds = addQuoteNoteAction.bind(null, customerId, quoteId);
  const areas = (quote.areas ?? []) as QuoteAreaWithMeasurementTotals[];
  const areaById = new Map(areas.map((area) => [area.id, area.name]));
  const notes = notesRes ?? [];
  const authorById = new Map<string, string>((usersRes ?? []).map((user) => [user.id, user.name]));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href={`/customers/${customerId}`} className="hover:underline">
              {customer?.name ?? 'Customer'}
            </Link>{' '}
            / <Link href={`/customers/${customerId}/quotes`} className="hover:underline">Quotes</Link> /{' '}
            {quote.quoteNumber}
          </div>
          <h2 className="text-2xl font-bold">{quote.title}</h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize">
            {quote.status}
          </span>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/quotes/${customerId}/${quoteId}/pdf`} target="_blank" rel="noreferrer">
              Download PDF
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/customers/${customerId}/quotes/${quoteId}/drawing`}>Drawing Workspace</Link>
          </Button>
          {(quote.status === 'sent' || quote.status === 'accepted') && quote.shareToken && (
            <CopyLinkButton token={quote.shareToken} />
          )}
          <form action={sendEmailWithIds}>
            <Button type="submit" variant="outline" size="sm">Email to Customer</Button>
          </form>
          {isDraft && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/customers/${customerId}/quotes/${quoteId}/edit`}>Edit</Link>
              </Button>
              <form action={sendWithIds}>
                <Button type="submit" size="sm">Send</Button>
              </form>
            </>
          )}
          {quote.status === 'sent' && (
            <>
              <form action={acceptWithIds}>
                <Button type="submit" size="sm">Accept</Button>
              </form>
              <form action={rejectWithIds}>
                <Button type="submit" variant="outline" size="sm">Reject</Button>
              </form>
            </>
          )}
          {quote.status === 'rejected' && (
            <form action={archiveWithIds}>
              <Button type="submit" variant="outline" size="sm">Archive</Button>
            </form>
          )}
          {quote.status === 'accepted' && (
            <form action={convertToOrderWithIds} className="flex items-center gap-2">
              <Input name="saleDate" type="date" defaultValue={today} required className="h-9 w-40" />
              <Button type="submit" size="sm">Convert to Order</Button>
            </form>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Quote #</dt>
                <dd>{quote.quoteNumber}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Valid Until</dt>
                <dd>{quote.validUntil ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Project</dt>
                <dd>
                  {quote.projectId ? (
                    <Link href={`/projects/${quote.projectId}`} className="text-primary hover:underline">
                      {project?.title ?? 'View project'}
                    </Link>
                  ) : (
                    '-'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Price List</dt>
                <dd>
                  {priceList ? (
                    <Link href={`/price-lists/${priceList.id}`} className="text-primary hover:underline">
                      {priceList.name}
                    </Link>
                  ) : (
                    '-'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{new Date(quote.updatedAt).toLocaleString()}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Terms</dt>
                <dd className="whitespace-pre-wrap">{quote.termsAndConditions ?? '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{money(quote.subtotalCents)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Discount</dt>
                <dd>{money(quote.discountCents)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tax Rate</dt>
                <dd>{quote.taxRateBps / 100}%</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-bold">{money(quote.totalCents)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Areas ({quote.areas?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {areas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No areas.</p>
            ) : (
              <div className="space-y-2">
                {areas.map((area) => (
                  <div key={area.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                    <div>
                      <div className="font-medium">{area.name}</div>
                      <div className="text-muted-foreground">{areaDetails(area)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{money(area.subtotalCents)}</span>
                      {isDraft && (
                        <form action={deleteAreaAction.bind(null, customerId, quoteId, area.id)}>
                          <Button type="submit" variant="ghost" size="sm">Remove</Button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isDraft && (
              <form action={createAreaWithIds} className="mt-4 rounded-md border p-3">
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="areaName">Name *</Label>
                    <Input id="areaName" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="areaSortOrder">Sort</Label>
                    <Input id="areaSortOrder" name="sortOrder" type="number" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="areaMaterial">Material</Label>
                    <Input id="areaMaterial" name="material" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="areaColor">Color</Label>
                    <Input id="areaColor" name="color" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="areaEdgeProfile">Edge Profile</Label>
                    <Input id="areaEdgeProfile" name="edgeProfile" />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <Label htmlFor="areaNotes">Notes</Label>
                    <Input id="areaNotes" name="notes" />
                  </div>
                </div>
                <Button type="submit" className="mt-3">Add Area</Button>
              </form>
            )}
          </CardContent>
        </Card>

        <MeasurementsCard customerId={customerId} quoteId={quoteId} areas={areas} isDraft={isDraft} />

        <PricingCard
          customerId={customerId}
          quoteId={quoteId}
          areas={areas}
          isDraft={isDraft}
        />

        <Card>
          <CardHeader>
            <CardTitle>Line Items ({quote.lineItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {quote.lineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No line items.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stone Type</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Dimensions</TableHead>
                    <TableHead>Sq Ft</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Labor</TableHead>
                    <TableHead>Total</TableHead>
                    {isDraft && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(quote.lineItems as QuoteLineItem[]).map((lineItem) => (
                    <TableRow key={lineItem.id}>
                      <TableCell>{lineItem.stoneType}</TableCell>
                      <TableCell>{lineItem.quoteAreaId ? areaById.get(lineItem.quoteAreaId) ?? '-' : '-'}</TableCell>
                      <TableCell>{dimensions(lineItem)}</TableCell>
                      <TableCell>{lineItem.sqFt ?? '-'}</TableCell>
                      <TableCell>
                        {lineItem.qty} {lineItem.qtyUnit}
                      </TableCell>
                      <TableCell>{money(lineItem.unitPriceCents)}</TableCell>
                      <TableCell>{money(lineItem.laborPriceCents)}</TableCell>
                      <TableCell>{money(lineItem.lineTotalCents)}</TableCell>
                      {isDraft && (
                        <TableCell>
                          <form action={deleteLineItemAction.bind(null, customerId, quoteId, lineItem.id)}>
                            <Button type="submit" variant="ghost" size="sm">Delete</Button>
                          </form>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {isDraft && (
              <form action={addLineItemWithIds} className="mt-4 rounded-md border p-3">
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="stoneType">Stone Type *</Label>
                    <Input id="stoneType" name="stoneType" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qty">Qty *</Label>
                    <Input id="qty" name="qty" type="number" step="0.001" min="0.001" defaultValue="1" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qtyUnit">Unit *</Label>
                    <Input id="qtyUnit" name="qtyUnit" required defaultValue="piece" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Sort</Label>
                    <Input id="sortOrder" name="sortOrder" type="number" defaultValue="0" />
                  </div>
                  {quote.areas?.length ? (
                    <div className="space-y-2">
                      <Label htmlFor="quoteAreaId">Area</Label>
                      <select
                        id="quoteAreaId"
                        name="quoteAreaId"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        defaultValue=""
                      >
                        <option value="">No area</option>
                        {areas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="lengthIn">Length In</Label>
                    <Input id="lengthIn" name="lengthIn" type="number" step="0.001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="widthIn">Width In</Label>
                    <Input id="widthIn" name="widthIn" type="number" step="0.001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thicknessCm">Thickness Cm</Label>
                    <Input id="thicknessCm" name="thicknessCm" type="number" step="0.001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edgeProfile">Edge Profile</Label>
                    <Input id="edgeProfile" name="edgeProfile" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Unit Price ($) *</Label>
                    <Input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="laborPrice">Labor Price ($)</Label>
                    <Input id="laborPrice" name="laborPrice" type="number" step="0.01" min="0" defaultValue="0" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input id="notes" name="notes" />
                  </div>
                </div>
                <Button type="submit" className="mt-3">Add Line Item</Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{quote.notes ?? '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quote Notes ({notes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes.</p>
              ) : (
                <ul className="space-y-3">
                  {notes.map((note) => (
                    <li key={note.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <span className={note.isPublic ? 'rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700' : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700'}>
                              {note.isPublic ? 'Public' : 'Internal'}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{note.body}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {(authorById.get(note.authorUserId) ?? note.authorUserId)} - {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <form action={deleteQuoteNoteAction.bind(null, customerId, quoteId, note.id)}>
                          <Button type="submit" variant="ghost" size="sm">Delete</Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addNoteWithIds} className="space-y-3">
                <textarea
                  name="body"
                  rows={3}
                  placeholder="Add a note..."
                  required
                  className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input name="isPublic" type="checkbox" className="h-4 w-4 rounded border-input" />
                  Visible to customer
                </label>
                <Button type="submit">Add Note</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

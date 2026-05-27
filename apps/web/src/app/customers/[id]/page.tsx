import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApiClientWithAuth } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { NotesCard } from './_components/notes-card';
import {
  addAddressAction,
  addContactAction,
  archiveCustomerAction,
  deleteAddressAction,
  deleteContactAction,
  makeBillingContactAction,
  makePrimaryContactAction,
  restoreCustomerAction,
} from '../_actions';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const SectionTitle = ({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
    <h3 className="text-sm font-semibold">{title}</h3>
    {action}
  </div>
);

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const client = await getApiClientWithAuth();

  const [
    { data: customer, error },
    { data: contactsRes },
    { data: addressesRes },
    { data: notesRes },
    { data: projectsRes },
    { data: quotesRes },
    { data: eventsRes },
  ] = await Promise.all([
    client.GET('/customers/{customerId}', { params: { path: { customerId: id } } }),
    client.GET('/customers/{customerId}/contacts', { params: { path: { customerId: id } } }),
    client.GET('/customers/{customerId}/addresses', { params: { path: { customerId: id } } }),
    client.GET('/customers/{customerId}/notes', { params: { path: { customerId: id } } }),
    client.GET('/projects', { params: { query: { customerId: id, limit: 50 } } }),
    client.GET('/customers/{customerId}/quotes', { params: { path: { customerId: id }, query: { limit: 5 } } }),
    client.GET('/customers/{customerId}/events', { params: { path: { customerId: id }, query: { limit: 5 } } }),
  ]);

  if (error || !customer) {
    notFound();
  }

  const contacts = contactsRes?.data ?? [];
  const addresses = addressesRes?.data ?? [];
  const notes = notesRes?.data ?? [];
  const projects = projectsRes?.data ?? [];
  const quotes = quotesRes?.data ?? [];
  const events = eventsRes?.data ?? [];
  const isArchived = !!customer.archivedAt;

  const archiveWithId = archiveCustomerAction.bind(null, id);
  const restoreWithId = restoreCustomerAction.bind(null, id);
  const addContactWithId = addContactAction.bind(null, id);
  const addAddressWithId = addAddressAction.bind(null, id);

  return (
  <div className="space-y-5">

    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="mb-1 text-sm text-muted-foreground">
          <Link href="/customers" className="hover:underline">Customers</Link> / {customer.name}
        </div>
        <h2 className="text-2xl font-bold">{customer.name}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={isArchived ? 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize border-red-200 bg-red-50 text-red-700' : 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize border-slate-200 bg-slate-50 text-slate-700'}>
          {isArchived ? "Archived" : customer.status}
        </span>
        <Button asChild variant="outline" size="sm">
          <Link href={'/customers/' + id + '/edit'}>Edit</Link>
        </Button>
        {isArchived ? (
          <form action={restoreWithId}>
            <Button type="submit" variant="outline" size="sm">Restore</Button>
          </form>
        ) : (
          <form action={archiveWithId}>
            <Button type="submit" variant="outline" size="sm">Archive</Button>
          </form>
        )}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-5">
      <Card>
        <SectionTitle title="Customer Info" />
        <CardContent className="p-4">
          <dl className="grid gap-3 text-sm">
            <div><dt className="text-muted-foreground">Name</dt><dd>{customer.name}</dd></div>
            <div><dt className="text-muted-foreground">Kind</dt><dd className="capitalize">{customer.customerKind}</dd></div>
            <div><dt className="text-muted-foreground">Type</dt><dd className="capitalize">{customer.type}</dd></div>
            {customer.companyName && <div><dt className="text-muted-foreground">Company</dt><dd>{customer.companyName}</dd></div>}
            {customer.industry && <div><dt className="text-muted-foreground">Industry</dt><dd>{customer.industry}</dd></div>}
            {customer.source && <div><dt className="text-muted-foreground">Source</dt><dd>{customer.source}</dd></div>}
            {customer.taxId && <div><dt className="text-muted-foreground">Tax ID</dt><dd>{customer.taxId}</dd></div>}
            <div><dt className="text-muted-foreground">Created</dt><dd>{new Date(customer.createdAt).toLocaleDateString()}</dd></div>
            {isArchived && customer.archivedAt && (
              <div><dt className="text-muted-foreground">Archived</dt><dd className="text-red-600">{new Date(customer.archivedAt).toLocaleDateString()}</dd></div>
            )}
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <SectionTitle title={"Contacts (" + contacts.length + ")"} />
          <CardContent className="p-4">
            <div className="space-y-3">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts.</p>
              ) : (
                <ul className="space-y-3">
                  {contacts.map((c) => (
                    <li key={c.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.firstName}{c.lastName ? " " + c.lastName : ""}</span>
                        {c.isPrimary && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Primary</span>}
                        {c.isBilling && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Billing</span>}
                      </div>
                      {c.jobTitle && <div className="text-muted-foreground">{c.jobTitle}</div>}
                      {c.email && <div>{c.email}</div>}
                      {c.phone && <div>{c.phone}</div>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <form action={deleteContactAction.bind(null, id, c.id)}>
                          <Button type="submit" variant="ghost" size="sm">Delete</Button>
                        </form>
                        {!c.isPrimary && (
                          <form action={makePrimaryContactAction.bind(null, id, c.id)}>
                            <Button type="submit" variant="outline" size="sm">Make Primary</Button>
                          </form>
                        )}
                        {!c.isBilling && (
                          <form action={makeBillingContactAction.bind(null, id, c.id)}>
                            <Button type="submit" variant="outline" size="sm">Make Billing</Button>
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addContactWithId} className="rounded-md border p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label htmlFor="firstName">First Name *</Label><Input id="firstName" name="firstName" required /></div>
                  <div className="space-y-2"><Label htmlFor="lastName">Last Name</Label><Input id="lastName" name="lastName" /></div>
                  <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" /></div>
                  <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" /></div>
                  <div className="space-y-2"><Label htmlFor="jobTitle">Job Title</Label><Input id="jobTitle" name="jobTitle" /></div>
                </div>
                <Button type="submit" className="mt-3">Add Contact</Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <SectionTitle title={"Addresses (" + addresses.length + ")"} />
          <CardContent className="p-4">
            <div className="space-y-3">
              {addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No addresses.</p>
              ) : (
                <ul className="space-y-3">
                  {addresses.map((a) => (
                    <li key={a.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="capitalize font-medium">{a.type}</span>
                        {a.isPrimary && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Primary</span>}
                        {a.isBilling && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Billing</span>}
                      </div>
                      <div>{a.line1}{a.line2 ? ", " + a.line2 : ""}</div>
                      <div>{a.city}{a.region ? ", " + a.region : ""} {a.postalCode ?? ""}</div>
                      <div>{a.country}</div>
                      <form action={deleteAddressAction.bind(null, id, a.id)} className="mt-3">
                        <Button type="submit" variant="ghost" size="sm">Delete</Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addAddressWithId} className="rounded-md border p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label htmlFor="addrType">Type *</Label><select id="addrType" name="type" required defaultValue="billing" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"><option value="billing">Billing</option><option value="shipping">Shipping</option><option value="other">Other</option></select></div>
                  <div className="space-y-2"><Label htmlFor="country">Country *</Label><Input id="country" name="country" required /></div>
                  <div className="space-y-2"><Label htmlFor="line1">Line 1 *</Label><Input id="line1" name="line1" required /></div>
                  <div className="space-y-2"><Label htmlFor="line2">Line 2</Label><Input id="line2" name="line2" /></div>
                  <div className="space-y-2"><Label htmlFor="city">City *</Label><Input id="city" name="city" required /></div>
                  <div className="space-y-2"><Label htmlFor="region">Region</Label><Input id="region" name="region" /></div>
                  <div className="space-y-2"><Label htmlFor="postalCode">Postal Code</Label><Input id="postalCode" name="postalCode" /></div>
                </div>
                <Button type="submit" className="mt-3">Add Address</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <Card>
      <SectionTitle
        title={"Jobs (" + projects.length + ")"}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/projects/new">+ New Job</Link>
          </Button>
        }
      />
      <CardContent className="p-0">
        {projects.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No jobs yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-700 text-left text-slate-100">
                <th className="px-4 py-2 font-semibold">Job Name</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Created</th>
                <th className="px-4 py-2 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b hover:bg-muted/40">
                  <td className="px-4 py-2">
                    <Link href={'/projects/' + project.id} className="font-medium text-primary hover:underline">{project.title}</Link>
                  </td>
                  <td className="px-4 py-2 capitalize">{project.status}</td>
                  <td className="px-4 py-2">{new Date(project.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{new Date(project.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>

    <Card>
      <SectionTitle
        title={"Quotes (" + quotes.length + ")"}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link href={'/customers/' + id + '/quotes'}>View All</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={'/customers/' + id + '/quotes/new'}>+ New Quote</Link></Button>
          </div>
        }
      />
      <CardContent className="p-0">
        {quotes.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No quotes.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-700 text-left text-slate-100">
                <th className="px-4 py-2 font-semibold">Quote</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-b hover:bg-muted/40">
                  <td className="px-4 py-2">
                    <Link href={'/customers/' + id + '/quotes/' + quote.id} className="font-medium text-primary hover:underline">{quote.quoteNumber} - {quote.title}</Link>
                  </td>
                  <td className="px-4 py-2 capitalize">{quote.status}</td>
                  <td className="px-4 py-2">{money(quote.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>

    <NotesCard customerId={id} initialNotes={notes} />

  </div>
  );
}

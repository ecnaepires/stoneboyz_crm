import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApiClient } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  addAddressAction,
  addContactAction,
  addNoteAction,
  archiveCustomerAction,
  deleteAddressAction,
  deleteContactAction,
  deleteNoteAction,
  makeBillingContactAction,
  makePrimaryContactAction,
  restoreCustomerAction,
} from '../_actions';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const client = getApiClient();

  const [
    { data: customer, error },
    { data: contactsRes },
    { data: addressesRes },
    { data: notesRes },
    { data: projectsRes },
  ] = await Promise.all([
    client.GET('/customers/{customerId}', { params: { path: { customerId: id } } }),
    client.GET('/customers/{customerId}/contacts', { params: { path: { customerId: id } } }),
    client.GET('/customers/{customerId}/addresses', { params: { path: { customerId: id } } }),
    client.GET('/customers/{customerId}/notes', { params: { path: { customerId: id } } }),
    client.GET('/projects', { params: { query: { customerId: id, limit: 50 } } }),
  ]);

  if (error || !customer) {
    notFound();
  }

  const contacts = contactsRes?.data ?? [];
  const addresses = addressesRes?.data ?? [];
  const notes = notesRes?.data ?? [];
  const projects = projectsRes?.data ?? [];
  const isArchived = !!customer.archivedAt;

  const archiveWithId = archiveCustomerAction.bind(null, id);
  const restoreWithId = restoreCustomerAction.bind(null, id);
  const addNoteWithId = addNoteAction.bind(null, id);
  const addContactWithId = addContactAction.bind(null, id);
  const addAddressWithId = addAddressAction.bind(null, id);

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href="/customers" className="hover:underline">Customers</Link> / {customer.name}
          </div>
          <h2 className="text-2xl font-bold">{customer.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize ${isArchived ? 'border-red-200 bg-red-50 text-red-700' : ''}`}>
            {isArchived ? 'Archived' : customer.status}
          </span>
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

      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Details</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href={`/customers/${id}/edit`}>Edit</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Kind</dt>
                <dd className="capitalize">{customer.customerKind}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="capitalize">{customer.type}</dd>
              </div>
              {customer.companyName && (
                <div>
                  <dt className="text-muted-foreground">Company</dt>
                  <dd>{customer.companyName}</dd>
                </div>
              )}
              {customer.industry && (
                <div>
                  <dt className="text-muted-foreground">Industry</dt>
                  <dd>{customer.industry}</dd>
                </div>
              )}
              {customer.source && (
                <div>
                  <dt className="text-muted-foreground">Source</dt>
                  <dd>{customer.source}</dd>
                </div>
              )}
              {customer.taxId && (
                <div>
                  <dt className="text-muted-foreground">Tax ID</dt>
                  <dd>{customer.taxId}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{new Date(customer.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{new Date(customer.updatedAt).toLocaleString()}</dd>
              </div>
              {isArchived && customer.archivedAt && (
                <div>
                  <dt className="text-muted-foreground">Archived</dt>
                  <dd className="text-red-600">{new Date(customer.archivedAt).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Projects ({projects.length})</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/new`}>New Project</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects.</p>
            ) : (
              <ul className="space-y-3">
                {projects.map((project) => (
                  <li key={project.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {project.title}
                        </Link>
                        <div className="mt-1 text-muted-foreground capitalize">
                          {project.status}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacts ({contacts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts.</p>
              ) : (
                <ul className="space-y-3">
                  {contacts.map((c) => (
                    <li key={c.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {c.firstName}{c.lastName ? ` ${c.lastName}` : ''}
                        </span>
                        {c.isPrimary && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Primary</span>
                        )}
                        {c.isBilling && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Billing</span>
                        )}
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
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" name="firstName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input id="jobTitle" name="jobTitle" />
                  </div>
                </div>
                <Button type="submit" className="mt-3">Add Contact</Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Addresses ({addresses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No addresses.</p>
              ) : (
                <ul className="space-y-3">
                  {addresses.map((a) => (
                    <li key={a.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="capitalize font-medium">{a.type}</span>
                        {a.isPrimary && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Primary</span>
                        )}
                        {a.isBilling && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Billing</span>
                        )}
                      </div>
                      <div>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</div>
                      <div>{a.city}{a.region ? `, ${a.region}` : ''} {a.postalCode ?? ''}</div>
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
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select id="type" name="type" required defaultValue="billing">
                      <option value="billing">Billing</option>
                      <option value="shipping">Shipping</option>
                      <option value="other">Other</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input id="country" name="country" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="line1">Line 1 *</Label>
                    <Input id="line1" name="line1" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="line2">Line 2</Label>
                    <Input id="line2" name="line2" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" name="city" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <Input id="region" name="region" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input id="postalCode" name="postalCode" />
                  </div>
                </div>
                <Button type="submit" className="mt-3">Add Address</Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes ({notes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes.</p>
              ) : (
                <ul className="space-y-3">
                  {notes.map((n) => (
                    <li key={n.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="whitespace-pre-wrap">{n.body}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <form action={deleteNoteAction.bind(null, id, n.id)}>
                          <Button type="submit" variant="ghost" size="sm">Delete</Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form action={addNoteWithId} className="space-y-3">
                <textarea
                  name="body"
                  rows={3}
                  placeholder="Add a note..."
                  required
                  className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <Button type="submit">Add Note</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { createQuoteAction } from '../_actions';
import { getApiClientWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export default async function NewQuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = await params;
  const client = await getApiClientWithAuth();
  const [{ data: customer }, { data: projectsRes }, { data: priceListsRes }] = await Promise.all([
    client.GET('/customers/{customerId}', { params: { path: { customerId } } }),
    client.GET('/projects', { params: { query: { customerId, limit: 100 } } }),
    client.GET('/price-lists', { params: { query: { limit: 100 } } }),
  ]);

  const projects = projectsRes?.data ?? [];
  const priceLists = priceListsRes?.data ?? [];
  const createWithCustomer = createQuoteAction.bind(null, customerId);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="mb-1 text-sm text-muted-foreground">
          <Link href={`/customers/${customerId}`} className="hover:underline">
            {customer?.name ?? 'Customer'}
          </Link>{' '}
          / <Link href={`/customers/${customerId}/quotes`} className="hover:underline">Quotes</Link> / New
        </div>
        <h2 className="text-2xl font-bold">New Quote</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createWithCustomer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" required placeholder="Quote title" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Project</Label>
                <Select id="projectId" name="projectId" defaultValue="">
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceListId">Price List</Label>
                <Select id="priceListId" name="priceListId" defaultValue="">
                  <option value="">None</option>
                  {priceLists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input id="validUntil" name="validUntil" type="date" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">Discount ($)</Label>
                <Input id="discount" name="discount" type="number" step="0.01" min="0" defaultValue="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRateBps">Tax Rate (bps)</Label>
                <Input id="taxRateBps" name="taxRateBps" type="number" min="0" defaultValue="0" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="termsAndConditions">Terms and Conditions</Label>
              <textarea
                id="termsAndConditions"
                name="termsAndConditions"
                rows={4}
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Create Quote</Button>
              <Button asChild type="button" variant="outline">
                <Link href={`/customers/${customerId}/quotes`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

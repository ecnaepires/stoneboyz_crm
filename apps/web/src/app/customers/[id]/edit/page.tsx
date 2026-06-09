import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateCustomerAction } from '../../_actions';
import {
  customerSourceOptions,
  customerStatusOptions,
  customerTypeOptions,
} from '../../form-options';
import { getApiClientWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface EditCustomerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const { id } = await params;
  const client = await getApiClientWithAuth();
  const { data: customer, error } = await client.GET('/customers/{customerId}', {
    params: { path: { customerId: id } },
  });

  if (error || !customer) {
    notFound();
  }

  const updateWithId = updateCustomerAction.bind(null, id);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="mb-1 text-sm text-muted-foreground">
          <Link href="/customers" className="hover:underline">Customers</Link> /{' '}
          <Link href={`/customers/${id}`} className="hover:underline">{customer.name}</Link> / Edit
        </div>
        <h2 className="text-2xl font-bold">Edit Customer</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateWithId} className="space-y-4">
            <input type="hidden" name="customerKind" value={customer.customerKind} />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Kind</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm capitalize text-muted-foreground">
                  {customer.customerKind}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select id="status" name="status" required defaultValue={customer.status}>
                  {customerStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required defaultValue={customer.name} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select id="type" name="type" required defaultValue={customer.type}>
                  {customerTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID</Label>
                <Input id="taxId" name="taxId" defaultValue={customer.taxId ?? ''} />
              </div>
            </div>

            {customer.customerKind === 'company' && (
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" name="companyName" defaultValue={customer.companyName ?? ''} />
              </div>
            )}

            {customer.customerKind === 'person' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" defaultValue={customer.firstName ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" defaultValue={customer.lastName ?? ''} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" name="industry" defaultValue={customer.industry ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select id="source" name="source" defaultValue={customer.source ?? ''}>
                  <option value="">Select source...</option>
                  {customerSourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Save Customer</Button>
              <Button asChild type="button" variant="outline">
                <Link href={`/customers/${id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

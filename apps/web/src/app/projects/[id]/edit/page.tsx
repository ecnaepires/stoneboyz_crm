import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateProjectAction } from '../../_actions';
import { getApiClientWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface EditProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  const client = await getApiClientWithAuth();
  const [{ data: project, error }, { data: customersRes }] = await Promise.all([
    client.GET('/projects/{projectId}', { params: { path: { projectId: id } } }),
    client.GET('/customers', { params: { query: { limit: 100 } } }),
  ]);

  if (error || !project) {
    notFound();
  }

  const customers = customersRes?.data ?? [];
  const updateWithId = updateProjectAction.bind(null, id);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="mb-1 text-sm text-muted-foreground">
          <Link href="/projects" className="hover:underline">Projects</Link> /{' '}
          <Link href={`/projects/${id}`} className="hover:underline">{project.title}</Link> / Edit
        </div>
        <h2 className="text-2xl font-bold">Edit Project</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateWithId} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer *</Label>
              <Select id="customerId" name="customerId" required defaultValue={project.customerId}>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" name="title" required defaultValue={project.title} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select id="status" name="status" required defaultValue={project.status}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={5}
                defaultValue={project.description ?? ''}
                className="flex min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Save Project</Button>
              <Button asChild type="button" variant="outline">
                <Link href={`/projects/${id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

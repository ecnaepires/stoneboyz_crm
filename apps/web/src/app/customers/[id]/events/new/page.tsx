import Link from 'next/link';
import { createEventAction } from '../_actions';
import { getApiClientWithAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = await params;
  const client = await getApiClientWithAuth();
  const [{ data: customer }, { data: projectsRes }, { data: users, error: usersError }] = await Promise.all([
    client.GET('/customers/{customerId}', { params: { path: { customerId } } }),
    client.GET('/projects', { params: { query: { customerId, limit: 100 } } }),
    client.GET('/users', {}),
  ]);

  const projects = projectsRes?.data ?? [];
  const assignees = users ?? [];
  const createWithCustomer = createEventAction.bind(null, customerId);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="mb-1 text-sm text-muted-foreground">
          <Link href={`/customers/${customerId}`} className="hover:underline">
            {customer?.name ?? 'Customer'}
          </Link>{' '}
          / <Link href={`/customers/${customerId}/events`} className="hover:underline">Events</Link> / New
        </div>
        <h2 className="text-2xl font-bold">New Event</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createWithCustomer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" required placeholder="Event title" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventType">Type *</Label>
                <Select id="eventType" name="eventType" required defaultValue="appointment">
                  <option value="appointment">Appointment</option>
                  <option value="shop_job">Shop Job</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointmentType">Appointment Type</Label>
                <Select id="appointmentType" name="appointmentType" defaultValue="">
                  <option value="">N/A</option>
                  <option value="template">Template</option>
                  <option value="deposit">Deposit</option>
                  <option value="material">Material</option>
                  <option value="cut">Cut</option>
                  <option value="fabrication">Fabrication</option>
                  <option value="install">Install</option>
                  <option value="invoice">Invoice</option>
                  <option value="repair">Repair</option>
                  <option value="other">Other</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Scheduled At *</Label>
                <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration Minutes *</Label>
                <Input id="durationMinutes" name="durationMinutes" type="number" min="1" defaultValue="60" required />
              </div>
            </div>

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
              <Label htmlFor="assigneeUserIds">Assignees</Label>
              <Select
                id="assigneeUserIds"
                name="assigneeUserIds"
                multiple
                disabled={assignees.length === 0}
                className="min-h-28"
              >
                {assignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                {usersError
                  ? 'User list unavailable for this account; the event will be assigned to you.'
                  : 'Hold Ctrl or Cmd to select multiple assignees. Leave blank to assign yourself.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" />
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
              <Button type="submit">Create Event</Button>
              <Button asChild type="button" variant="outline">
                <Link href={`/customers/${customerId}/events`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { archiveProjectAction } from '../_actions';
import { getApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const client = getApiClient();
  const { data: project, error } = await client.GET('/projects/{projectId}', {
    params: { path: { projectId: id } },
  });

  if (error || !project) {
    notFound();
  }

  const { data: customer } = await client.GET('/customers/{customerId}', {
    params: { path: { customerId: project.customerId } },
  });
  const archiveWithId = archiveProjectAction.bind(null, id);

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href="/projects" className="hover:underline">Projects</Link> / {project.title}
          </div>
          <h2 className="text-2xl font-bold">{project.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize">
            {project.status}
          </span>
          <form action={archiveWithId}>
            <Button type="submit" variant="outline" size="sm">Archive</Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Details</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${id}/edit`}>Edit</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Customer</dt>
              <dd>
                <Link
                  href={`/customers/${project.customerId}`}
                  className="text-primary hover:underline"
                >
                  {customer?.name ?? 'View customer'}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{project.status}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Description</dt>
              <dd className="whitespace-pre-wrap">{project.description ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(project.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{new Date(project.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

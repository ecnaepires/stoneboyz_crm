import Link from 'next/link';
import { getApiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: 'draft' | 'active' | 'completed' }>;
}) {
  const { search, status } = await searchParams;
  const client = getApiClient();
  const { data, error } = await client.GET('/projects', {
    params: {
      query: {
        limit: 50,
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
      },
    },
  });

  if (error) {
    return (
      <div className="text-red-600">
        Failed to load projects: {JSON.stringify(error)}
      </div>
    );
  }

  const projects = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Projects</h2>
        <Button asChild>
          <Link href="/projects/new">+ New Project</Link>
        </Button>
      </div>

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ''}
          placeholder="Search projects..."
          className="flex h-10 w-80 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <Select name="status" defaultValue={status ?? ''} className="w-44">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </Select>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Filter
        </button>
        {(search || status) && (
          <a
            href="/projects"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Clear
          </a>
        )}
      </form>

      {projects.length === 0 ? (
        <p className="text-muted-foreground">No projects yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {project.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="capitalize">{project.status}</span>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/customers/${project.customerId}`}
                    className="text-primary hover:underline"
                  >
                    View customer
                  </Link>
                </TableCell>
                <TableCell>
                  {new Date(project.updatedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

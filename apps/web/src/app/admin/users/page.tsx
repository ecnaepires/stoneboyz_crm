import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiClientWithAuth } from '@/lib/api';
import { updateRoleAction } from './_actions';

export default async function AdminUsersPage() {
  const client = await getApiClientWithAuth();
  const { data, error } = await client.GET('/users', {});

  if (error) {
    return <div className="text-red-600">Failed to load users: {JSON.stringify(error)}</div>;
  }

  const users = data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Users</h2>
        <p className="text-sm text-muted-foreground">Manage role assignments for CRM access.</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-64">Update Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell className="capitalize">{user.role}</TableCell>
              <TableCell>
                <form action={updateRoleAction.bind(null, user.id)} className="flex items-center gap-2">
                  <Select name="role" defaultValue={user.role} className="w-40">
                    <option value="admin">Admin</option>
                    <option value="estimator">Estimator</option>
                    <option value="installer">Installer</option>
                  </Select>
                  <Button type="submit" variant="outline">Save</Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

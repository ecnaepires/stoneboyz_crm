'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAssigneesAction } from '@/app/_actions/assignees';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export type AssigneeOption = {
  id: string;
  name: string;
  assigneeType: string;
};

export function AssigneeSelect({
  assignees,
  name = 'assigneeIds',
  defaultSelectedIds,
  label = 'Assignees',
}: {
  assignees: AssigneeOption[];
  name?: string;
  defaultSelectedIds?: string[] | undefined;
  label?: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newNames, setNewNames] = useState('');
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Select
        id={name}
        name={name}
        multiple
        className="min-h-28"
        disabled={assignees.length === 0}
        defaultValue={defaultSelectedIds}
      >
        {assignees.map((assignee) => (
          <option key={assignee.id} value={assignee.id}>
            {assignee.name}
            {assignee.assigneeType !== 'person' ? ` (${assignee.assigneeType.replace(/_/g, ' ')})` : ''}
          </option>
        ))}
      </Select>
      <p className="text-xs text-muted-foreground">
        Hold Ctrl or Cmd to select multiple. Leave blank for no assignees.
      </p>
      {adding ? (
        <div className="space-y-2 rounded-md border p-3">
          <Label htmlFor={`${name}-new`}>New assignees (one name per line)</Label>
          <textarea
            id={`${name}-new`}
            value={newNames}
            onChange={(event) => setNewNames(event.currentTarget.value)}
            rows={3}
            placeholder={'Truck 1\nInstall Crew A'}
            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending || newNames.trim().length === 0}
              onClick={() => {
                startTransition(async () => {
                  await createAssigneesAction(newNames);
                  setNewNames('');
                  setAdding(false);
                  router.refresh();
                });
              }}
            >
              {isPending ? 'Adding...' : 'Add'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
          + Add Assignee
        </Button>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { listCustomerProjectsAction, reassignSlabAction } from './_actions';

interface ReassignFormProps {
  customers: Array<{ id: string; name: string }>;
  sourceCustomerId: string;
  sourceProjectId: string;
  slabId: string;
  ownership: string;
}

export function ReassignForm({
  customers,
  sourceCustomerId,
  sourceProjectId,
  slabId,
  ownership,
}: ReassignFormProps) {
  const [open, setOpen] = useState(false);
  const customerLocked = ownership === 'customer_supplied';
  const [targetCustomerId, setTargetCustomerId] = useState(sourceCustomerId);
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [loadingProjects, startLoading] = useTransition();

  useEffect(() => {
    if (!open) return;
    startLoading(async () => {
      setProjects(await listCustomerProjectsAction(targetCustomerId));
    });
  }, [open, targetCustomerId]);

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Reassign
      </Button>
    );
  }

  const action = reassignSlabAction.bind(null, sourceCustomerId, sourceProjectId, slabId);

  return (
    <form action={action} className="flex w-full flex-col gap-2 rounded-md border p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {customerLocked ? (
          <div className="text-xs text-muted-foreground">
            Customer-supplied — stays with this customer
            <input type="hidden" name="targetCustomerId" value={sourceCustomerId} />
          </div>
        ) : (
          <Select
            name="targetCustomerId"
            value={targetCustomerId}
            onChange={(event) => setTargetCustomerId(event.target.value)}
            className="h-9"
          >
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </Select>
        )}
        <Select name="targetProjectId" required className="h-9" disabled={loadingProjects}>
          <option value="">{loadingProjects ? 'Loading jobs…' : 'Target job…'}</option>
          {projects
            .filter((project) => !(targetCustomerId === sourceCustomerId && project.id === sourceProjectId))
            .map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
        </Select>
      </div>
      <input
        name="reason"
        required
        placeholder="Reason for reassignment"
        className="h-9 w-full rounded-md border px-3 text-sm"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm">Confirm reassign</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

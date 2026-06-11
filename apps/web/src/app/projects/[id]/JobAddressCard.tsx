'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { updateJobAddressAction } from '../_actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface JobAddressValue {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface JobAddressCardProps {
  projectId: string;
  jobAddress: JobAddressValue | null;
}

const FIELDS: Array<{ key: keyof JobAddressValue; label: string }> = [
  { key: 'line1', label: 'Address Line 1' },
  { key: 'line2', label: 'Address Line 2' },
  { key: 'city', label: 'City' },
  { key: 'region', label: 'State / Region' },
  { key: 'postalCode', label: 'Postal Code' },
  { key: 'country', label: 'Country' },
  { key: 'contactName', label: 'Site Contact' },
  { key: 'phone', label: 'Site Phone' },
  { key: 'email', label: 'Site Email' },
];

export function JobAddressContent({ projectId, jobAddress }: JobAddressCardProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await updateJobAddressAction(projectId, formData);
          setEditing(false);
        }}
        className="space-y-3"
      >
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={`job-address-${key}`} className="text-xs">
              {label}
            </Label>
            <Input
              id={`job-address-${key}`}
              name={key}
              defaultValue={jobAddress?.[key] ?? ''}
              type={key === 'email' ? 'email' : 'text'}
            />
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm">
            Save Job Address
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2">
      {jobAddress ? (
        <address className="not-italic">
          <div>
            {jobAddress.line1}
            {jobAddress.line2 ? `, ${jobAddress.line2}` : ''}
          </div>
          <div>
            {jobAddress.city}
            {jobAddress.region ? `, ${jobAddress.region}` : ''} {jobAddress.postalCode ?? ''}
          </div>
          {jobAddress.country ? <div>{jobAddress.country}</div> : null}
          {jobAddress.contactName ? (
            <div className="mt-1 text-muted-foreground">Contact: {jobAddress.contactName}</div>
          ) : null}
          {jobAddress.phone ? <div className="text-muted-foreground">{jobAddress.phone}</div> : null}
          {jobAddress.email ? <div className="text-muted-foreground">{jobAddress.email}</div> : null}
        </address>
      ) : (
        <p className="text-muted-foreground">
          No site address set. Defaults from the account address at creation - edit to set one.
        </p>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Edit job address"
        onClick={() => setEditing(true)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}

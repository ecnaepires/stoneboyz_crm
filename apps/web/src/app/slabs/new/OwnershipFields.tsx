'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/select';

interface OwnershipFieldsProps {
  customers: Array<{ id: string; name: string }>;
}

export function OwnershipFields({ customers }: OwnershipFieldsProps) {
  const [ownership, setOwnership] = useState('shop_owned');
  const isCustomerSupplied = ownership === 'customer_supplied';

  return (
    <>
      <Select
        name="ownership"
        required
        value={ownership}
        onChange={(event) => setOwnership(event.target.value)}
        className="h-10"
      >
        <option value="shop_owned">Shop owned</option>
        <option value="job_purchased">Job purchased</option>
        <option value="customer_supplied">Customer supplied</option>
      </Select>
      {isCustomerSupplied && (
        <Select name="ownerCustomerId" required className="h-10">
          <option value="">Owning customer…</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </Select>
      )}
    </>
  );
}

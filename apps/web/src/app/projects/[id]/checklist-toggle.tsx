'use client';

import { useEffect, useState, useTransition } from 'react';

interface ChecklistToggleProps {
  label: string;
  checked: boolean;
  action: (value: boolean) => Promise<void>;
}

export function ChecklistToggle({ label, checked, action }: ChecklistToggleProps) {
  const [isPending, startTransition] = useTransition();
  const [isChecked, setIsChecked] = useState(checked);

  useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  return (
    <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={isChecked}
        disabled={isPending}
        onChange={(event) => {
          const nextValue = event.currentTarget.checked;
          setIsChecked(nextValue);
          startTransition(async () => {
            try {
              await action(nextValue);
            } catch (error) {
              setIsChecked(!nextValue);
              throw error;
            }
          });
        }}
        className="h-4 w-4 rounded border-input"
      />
    </label>
  );
}

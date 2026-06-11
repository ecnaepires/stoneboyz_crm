'use client';

import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export type MultiSelectOption = {
  value: string;
  label: string;
};

export function MultiSelect({
  id,
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean | undefined;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        multiple
        className="min-h-28"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(
            Array.from(event.currentTarget.selectedOptions).map(
              (option) => option.value,
            ),
          );
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

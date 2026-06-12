import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiClientWithAuth } from '@/lib/api';
import { createHolidayAction, deleteHolidayAction, patchWorkDaysAction } from './_actions';

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export default async function ShopSettingsPage() {
  const client = await getApiClientWithAuth();

  const today = new Date().toISOString().slice(0, 10);
  const twoYearsOut = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [settingsRes, holidaysRes] = await Promise.all([
    client.GET('/shop-settings'),
    client.GET('/shop-settings/holidays', { params: { query: { from: today, to: twoYearsOut } } }),
  ]);

  const workDays: number[] = settingsRes.data?.data.workDays ?? [1, 2, 3, 4, 5];
  const holidays = holidaysRes.data?.data ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-10 p-6">
      <div>
        <h1 className="text-xl font-semibold">Shop Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure which days the shop works and company holidays.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Work Days</h2>
        <form action={patchWorkDaysAction} className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {WEEKDAYS.map((day) => (
              <label key={day.value} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  name="workDay"
                  value={day.value}
                  defaultChecked={workDays.includes(day.value)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm">{day.label}</span>
              </label>
            ))}
          </div>
          <Button type="submit" variant="outline" size="sm">
            Save Work Days
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Holidays</h2>
        <form action={createHolidayAction} className="flex items-end gap-2">
          <div className="space-y-1">
            <label htmlFor="holidayDate" className="text-xs text-muted-foreground">Date</label>
            <Input id="holidayDate" name="holidayDate" type="date" required className="w-40" />
          </div>
          <div className="space-y-1">
            <label htmlFor="holidayName" className="text-xs text-muted-foreground">Name</label>
            <Input id="holidayName" name="name" type="text" placeholder="e.g. Thanksgiving" required className="w-48" />
          </div>
          <Button type="submit" variant="outline" size="sm">Add Holiday</Button>
        </form>

        {holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No holidays configured.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  <span className="font-medium tabular-nums">{h.holidayDate}</span>
                  <span className="ml-3 text-muted-foreground">{h.name}</span>
                </span>
                <form action={deleteHolidayAction.bind(null, h.id)}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

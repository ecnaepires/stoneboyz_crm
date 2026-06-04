import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/button';

const apiFetch = async (path: string, init?: RequestInit) => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session_token');
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) return new Response(null, { status: 500 });
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> | undefined) };
  if (sessionCookie) headers.Cookie = `better-auth.session_token=${sessionCookie.value}`;
  return fetch(`${new URL(baseUrl).origin}${path}`, { ...init, headers, cache: 'no-store' });
};

async function createLocationAction(formData: FormData) {
  'use server';
  await apiFetch('/api/v1/inventory/locations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      zone: formData.get('zone'),
      rack: formData.get('rack'),
      bin: formData.get('bin') || undefined,
      slot: formData.get('slot') || undefined,
      notes: formData.get('notes') || undefined,
    }),
  });
  revalidatePath('/inventory/locations');
}

export default async function LocationsPage() {
  const response = await apiFetch('/api/v1/inventory/locations');
  const body = response.ok ? await response.json() as { data?: Array<Record<string, unknown>> } : { data: [] };
  const locations = body.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Storage Locations</h2>
        <p className="text-sm text-muted-foreground">Structured places staff can find material.</p>
      </div>
      <form action={createLocationAction} className="grid max-w-4xl grid-cols-5 gap-3 rounded-md border p-4">
        <input name="zone" required placeholder="Zone" className="h-10 rounded-md border px-3 text-sm" />
        <input name="rack" required placeholder="Rack" className="h-10 rounded-md border px-3 text-sm" />
        <input name="bin" placeholder="Bin" className="h-10 rounded-md border px-3 text-sm" />
        <input name="slot" placeholder="Slot" className="h-10 rounded-md border px-3 text-sm" />
        <Button type="submit">Add</Button>
      </form>
      <div className="rounded-md border">
        {locations.map((location) => (
          <div key={String(location.id)} className="border-b px-4 py-3 text-sm last:border-b-0">
            {String(location.zone)} / {String(location.rack)} / {String(location.bin ?? '-')} / {String(location.slot ?? '-')}
          </div>
        ))}
      </div>
    </div>
  );
}

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

async function createReceiptAction(formData: FormData) {
  'use server';
  await apiFetch('/api/v1/inventory/receipts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      vendor: formData.get('vendor') || undefined,
      notes: formData.get('notes') || undefined,
    }),
  });
  revalidatePath('/inventory/receipts');
}

export default async function ReceiptsPage() {
  const response = await apiFetch('/api/v1/inventory/receipts');
  const body = response.ok ? await response.json() as { data?: Array<Record<string, unknown>> } : { data: [] };
  const receipts = body.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Inventory Receipts</h2>
        <p className="text-sm text-muted-foreground">Truck unload batches for fast slab intake.</p>
      </div>
      <form action={createReceiptAction} className="grid max-w-3xl grid-cols-[1fr_2fr_auto] gap-3 rounded-md border p-4">
        <input name="vendor" placeholder="Vendor / source" className="h-10 rounded-md border px-3 text-sm" />
        <input name="notes" placeholder="Notes" className="h-10 rounded-md border px-3 text-sm" />
        <Button type="submit">Add</Button>
      </form>
      <div className="rounded-md border">
        {receipts.map((receipt) => (
          <div key={String(receipt.id)} className="grid grid-cols-3 gap-3 border-b px-4 py-3 text-sm last:border-b-0">
            <span className="font-medium">{String(receipt.vendor ?? 'No vendor')}</span>
            <span>{receipt.receivedAt ? new Date(String(receipt.receivedAt)).toLocaleString() : '-'}</span>
            <span className="text-muted-foreground">{String(receipt.id)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

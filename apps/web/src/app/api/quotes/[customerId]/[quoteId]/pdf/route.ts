import { cookies } from 'next/headers';

interface RouteContext {
  params: Promise<{
    customerId: string;
    quoteId: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return new Response('API_BASE_URL environment variable is not set', { status: 500 });
  }

  const { customerId, quoteId } = await context.params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('better-auth.session_token');
  const headers = new Headers();

  if (sessionCookie) {
    headers.set('Cookie', `better-auth.session_token=${sessionCookie.value}`);
  }

  const response = await fetch(`${baseUrl}/customers/${customerId}/quotes/${quoteId}/pdf`, {
    headers,
    cache: 'no-store'
  });

  if (!response.ok) {
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'text/plain; charset=utf-8'
      }
    });
  }

  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/pdf',
      'Content-Disposition': response.headers.get('Content-Disposition') ?? 'attachment; filename="quote.pdf"'
    }
  });
}

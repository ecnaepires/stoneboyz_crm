let currentToken: string | undefined;

export function setTestAuthToken(token: string): void {
  currentToken = token;
}

const originalFetch = globalThis.fetch;

globalThis.fetch = function patchedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (!currentToken) {
    return originalFetch(input, init);
  }
  const headers = new Headers(init?.headers);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }
  return originalFetch(input, { ...init, headers });
} as typeof fetch;

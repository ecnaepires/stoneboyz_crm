'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await authClient.signUp.email({ name, email, password });

    setIsSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? 'Sign up failed');
      return;
    }

    router.push('/customers');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Sign up</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your Stoneboyz CRM workspace access.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

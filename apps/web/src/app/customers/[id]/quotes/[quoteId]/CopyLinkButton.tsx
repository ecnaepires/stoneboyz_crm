'use client';

import { Button } from '@/components/ui/button';

export function CopyLinkButton({ token }: { token: string }) {
  const handleCopy = () => {
    const url = `${window.location.origin}/portal/quotes/${token}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      Copy Share Link
    </Button>
  );
}

"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      title="Print schedule"
    >
      <Printer className="mr-1 size-4" aria-hidden="true" />
      Print
    </Button>
  );
}

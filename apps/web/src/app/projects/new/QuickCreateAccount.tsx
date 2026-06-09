"use client";

import { useState } from "react";
import { quickCreateAccountAction } from "../_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function QuickCreateAccount() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Add Account
      </Button>
    );
  }

  return (
    <div className="rounded-md border p-3">
      <form action={quickCreateAccountAction} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="quick-account-name">Account Name *</Label>
          <Input id="quick-account-name" name="name" required placeholder="Mike Bath" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quick-account-kind">Type</Label>
          <Select id="quick-account-kind" name="customerKind" defaultValue="person">
            <option value="person">Person</option>
            <option value="company">Company</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Save Account
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

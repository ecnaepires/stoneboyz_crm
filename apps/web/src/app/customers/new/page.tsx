'use client';

import { createCustomerAction } from '../_actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function NewCustomerPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">New Customer</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCustomerAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerKind">Customer Kind *</Label>
                <Select id="customerKind" name="customerKind" required>
                  <option value="">Select kind...</option>
                  <option value="company">Company</option>
                  <option value="person">Person</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select id="status" name="status" required defaultValue="lead">
                  <option value="lead">Lead</option>
                  <option value="qualified">Qualified</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="churned">Churned</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required placeholder="Customer display name" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" name="companyName" placeholder="Required if kind is Company" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select id="type" name="type" required defaultValue="prospect">
                  <option value="prospect">Prospect</option>
                  <option value="customer">Customer</option>
                  <option value="partner">Partner</option>
                  <option value="vendor">Vendor</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" name="firstName" placeholder="Required if kind is Person" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" name="industry" placeholder="e.g. Construction" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input id="source" name="source" placeholder="e.g. Referral" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID</Label>
              <Input id="taxId" name="taxId" placeholder="Optional" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Create Customer</Button>
              <Button type="button" variant="outline" onClick={() => history.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

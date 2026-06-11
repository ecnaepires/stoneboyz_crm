import Link from "next/link";
import { createProjectAction } from "../_actions";
import { getApiClientWithAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { QuickCreateAccount } from "./QuickCreateAccount";

interface NewProjectPageProps {
  searchParams: Promise<{ customerId?: string }>;
}

export default async function NewProjectPage({
  searchParams,
}: NewProjectPageProps) {
  const { customerId: preselectedCustomerId = "" } = await searchParams;
  const client = await getApiClientWithAuth();
  const [customersResult, jobTemplatesResult] = await Promise.all([
    client.GET("/customers", {
      params: { query: { limit: 100 } },
    }),
    client.GET("/job-templates", {}),
  ]);

  if (customersResult.error) {
    return (
      <div className="text-red-600">
        Failed to load accounts: {JSON.stringify(customersResult.error)}
      </div>
    );
  }

  if (jobTemplatesResult.error) {
    return (
      <div className="text-red-600">
        Failed to load job templates: {JSON.stringify(jobTemplatesResult.error)}
      </div>
    );
  }

  const customers = customersResult.data?.data ?? [];
  const jobTemplates = jobTemplatesResult.data ?? [];
  const defaultTemplate =
    jobTemplates.find((template) => template.isDefault) ?? jobTemplates[0];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="mb-1 text-sm text-muted-foreground">
          <Link href="/projects" className="hover:underline">
            Jobs
          </Link>{" "}
          / New
        </div>
        <h2 className="text-2xl font-bold">Create Job</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Account not in the list yet?
            </p>
            <QuickCreateAccount />
          </div>
          <form action={createProjectAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">Account *</Label>
              <Select
                id="customerId"
                name="customerId"
                required
                defaultValue={preselectedCustomerId}
              >
                <option value="">Select Account...</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Name *</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="Kitchen Countertops"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTemplateId">Job Type *</Label>
                <Select
                  id="jobTemplateId"
                  name="jobTemplateId"
                  required
                  defaultValue={defaultTemplate?.id ?? ""}
                  disabled={jobTemplates.length === 0}
                >
                  <option value="">Select Template...</option>
                  {jobTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
                {jobTemplates.length === 0 ? (
                  <p className="text-sm text-red-600">
                    No job templates found. Add the Standard Job seed first.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Create Job</Button>
              <Button asChild type="button" variant="outline">
                <Link href="/projects">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

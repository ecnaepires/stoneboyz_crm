import { CalendarDays, FileText, Package, Users } from "lucide-react";
import { getApiClientWithAuth } from "@/lib/api";
import { StatCard } from "./_components/stat-card";
import { RevenueChart } from "./_components/revenue-chart";
import { PipelineDonut } from "./_components/pipeline-donut";
import { RecentQuotesTable } from "./_components/recent-quotes-table";
import { formatCurrencyFromCents } from "./_components/utils";

export default async function DashboardPage() {
  const client = await getApiClientWithAuth();
  const { data, error } = await client.GET("/dashboard", {});

  if (error) {
    console.error("Failed to load dashboard", error);

    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
        An unexpected error occurred while loading the dashboard.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-sm text-muted-foreground">
        No dashboard data available.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Welcome back — here&apos;s your shop at a glance.
          </p>
        </div>
        <span className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
          This month
        </span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Customers"
          value={data.activeCustomers}
          icon={Users}
        />
        <StatCard
          label="Open Quotes"
          value={data.openQuotes.count}
          sub={formatCurrencyFromCents(data.openQuotes.totalCents)}
          icon={FileText}
        />
        <StatCard
          label="Orders this Month"
          value={data.ordersThisMonth.count}
          sub={formatCurrencyFromCents(data.ordersThisMonth.totalCents)}
          icon={Package}
        />
        <StatCard
          label="Events this Week"
          value={data.eventsThisWeek}
          icon={CalendarDays}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <RevenueChart data={data.revenueSeries} />
        <PipelineDonut pipeline={data.pipeline} />
      </section>

      <RecentQuotesTable quotes={data.recentQuotes} />
    </div>
  );
}

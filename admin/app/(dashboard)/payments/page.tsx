"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { StatusBadge } from "@/components/admin/status-badge";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { formatDate } from "@/lib/utils";
import { CreditCard, DollarSign, Hotel, UserCog } from "lucide-react";

type ReportsData = {
  counts: {
    users: number;
    guides: number;
    places: number;
    hotels: number;
    restaurants: number;
  };
  revenue: {
    totalRevenue: number;
    hotelRevenue: number;
    guideRevenue: number;
  };
  recentBookings: {
    id: string;
    type: "HOTEL" | "GUIDE";
    title: string;
    user: string;
    amount: number;
    status: string;
    date: string;
  }[];
};

export default function PaymentsPage() {
  const { data, loading, error, refetch } = useAdminData<ReportsData>("/admin/api/reports");

  if (loading) return <LoadingState rows={5} />;
  if (error || !data) return <ErrorState message={error ?? "Failed to load"} onRetry={refetch} />;

  const { revenue, recentBookings } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments & Transactions"
        subtitle="Revenue analytics, financial breakdown, and transaction history."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Platform Revenue"
          value={`$${revenue.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
        />
        <StatCard
          label="Hotel Booking Revenue"
          value={`$${revenue.hotelRevenue.toLocaleString()}`}
          icon={Hotel}
        />
        <StatCard
          label="Guide Booking Revenue"
          value={`$${revenue.guideRevenue.toLocaleString()}`}
          icon={UserCog}
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Completed Transactions
        </h2>

        {recentBookings.length === 0 ? (
          <div className="mono-card p-8 text-center text-muted-foreground">
            No completed financial transactions recorded yet.
          </div>
        ) : (
          <div className="mono-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Title / Service</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentBookings.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/20">
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          <CreditCard className="h-3 w-3" />
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{tx.title}</td>
                      <td className="p-3 text-muted-foreground">{tx.user}</td>
                      <td className="p-3 text-xs text-muted-foreground">{formatDate(tx.date)}</td>
                      <td className="p-3 text-right font-mono font-semibold">${tx.amount.toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <StatusBadge status={tx.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Button } from "@/components/ui/button";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { getApiBaseUrl } from "@/lib/api/config";
import { toBackendPath, withAuthHeaders } from "@/lib/api/client";
import { Download, FileSpreadsheet, Hotel, PackageOpen, UserCog, Users } from "lucide-react";
import { toast } from "sonner";

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
};

export default function ReportsPage() {
  const { data, loading, error, refetch } = useAdminData<ReportsData>("/admin/api/reports");
  const [downloading, setDownloading] = React.useState<string | null>(null);

  const downloadCsv = async (type: string) => {
    try {
      setDownloading(type);
      const headers = await withAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}${toBackendPath("/admin/api/reports/export")}?type=${type}`, {
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} report exported successfully`);
    } catch {
      toast.error("Unable to export report right now. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <LoadingState rows={5} />;
  if (error || !data) return <ErrorState message="Unable to load reports right now. Please try again." onRetry={refetch} />;

  const { counts, revenue } = data;

  const exportItems = [
    { type: "users", title: "User Directory Export", desc: "List of all registered users with contact details & registration dates.", icon: Users },
    { type: "bookings", title: "Bookings & Reservations", desc: "Detailed log of guide bookings, hotel stays, and restaurant bookings.", icon: FileSpreadsheet },
    { type: "places", title: "Places & Destinations", desc: "Complete catalog of places, categories, locations, and pricing.", icon: PackageOpen },
    { type: "revenue", title: "Financial & Revenue Ledger", desc: "Summary of completed booking payments and total platform earnings.", icon: Hotel },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Exports"
        subtitle="Export platform data in CSV format for offline reporting and audit compliance."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={counts.users.toLocaleString()} icon={Users} />
        <StatCard label="Active Guides" value={counts.guides.toLocaleString()} icon={UserCog} />
        <StatCard label="Total Places" value={counts.places.toLocaleString()} icon={PackageOpen} />
        <StatCard label="Platform Revenue" value={`$${revenue.totalRevenue.toLocaleString()}`} icon={FileSpreadsheet} />
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Data Export Hub
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {exportItems.map((item) => {
            const Icon = item.icon;
            const isBusy = downloading === item.type;
            return (
              <div key={item.type} className="mono-card flex items-start justify-between gap-4 p-5">
                <div className="flex gap-4">
                  <div className="rounded-lg bg-primary/10 p-3 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => downloadCsv(item.type)}
                  className="shrink-0 gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  {isBusy ? "Exporting…" : "Export CSV"}
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Button } from "@/components/ui/button";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { del } from "@/lib/api/mutate";
import { formatDate } from "@/lib/utils";
import type { AdminSession } from "@/lib/types";
import { KeyRound, ShieldAlert, Smartphone } from "lucide-react";
import { toast } from "sonner";

export default function SessionsPage() {
  const { data, loading, error, refetch } = useAdminData<{ sessions: AdminSession[] }>(
    "/admin/api/sessions"
  );
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  const handleRevoke = async (sessionId: string) => {
    if (!confirm("Are you sure you want to revoke this admin session?")) return;
    try {
      setRevokingId(sessionId);
      await del(`/admin/api/sessions/${sessionId}`);
      toast.success("Session revoked successfully");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Session & Device Management"
        subtitle="Monitor active admin sessions, view device identifiers, and revoke compromised tokens."
      />

      <section>
        {loading ? (
          <LoadingState rows={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : !data?.sessions?.length ? (
          <div className="mono-card p-8 text-center text-muted-foreground">No active admin sessions logged.</div>
        ) : (
          <div className="mono-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3">Admin</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">User Agent / Device</th>
                    <th className="p-3">Issued Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Revoke Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="p-3 font-medium">
                        <div>{s.admin?.name ?? s.adminId}</div>
                        <div className="text-xs text-muted-foreground">{s.admin?.email}</div>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{s.ip ?? "Unknown"}</td>
                      <td className="p-3 text-xs max-w-xs truncate text-muted-foreground">
                        {s.userAgent ?? "Standard Browser Session"}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{formatDate(s.issuedAt)}</td>
                      <td className="p-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            !s.isRevoked
                              ? "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                              : "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                          }`}
                        >
                          {!s.isRevoked ? "ACTIVE" : "REVOKED"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {!s.isRevoked && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={revokingId === s.id}
                            onClick={() => handleRevoke(s.id)}
                            className="gap-1"
                          >
                            <ShieldAlert className="h-3 w-3" />
                            Revoke
                          </Button>
                        )}
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

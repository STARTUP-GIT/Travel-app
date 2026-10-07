"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { SearchInput } from "@/components/admin/search-input";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { formatDate } from "@/lib/utils";
import type { AuditLog } from "@/lib/types";
import { Eye, History, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AuditLogsPage() {
  const [entityFilter, setEntityFilter] = React.useState("");
  const { data, loading, error, refetch } = useAdminData<{ logs: AuditLog[]; total: number }>(
    "/admin/api/audit-logs",
    { query: entityFilter ? { entity: entityFilter } : undefined }
  );

  const [inspectLog, setInspectLog] = React.useState<AuditLog | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Complete immutable trail of admin operations and system configuration changes."
      >
        <SearchInput
          value={entityFilter}
          onChange={setEntityFilter}
          placeholder="Filter by entity (e.g. USER, PLACE)..."
          className="w-full sm:w-64"
        />
      </PageHeader>

      <section>
        {loading ? (
          <LoadingState rows={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : !data?.logs?.length ? (
          <div className="mono-card p-8 text-center text-muted-foreground">No audit logs recorded yet.</div>
        ) : (
          <div className="mono-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Admin</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Entity</th>
                    <th className="p-3">Entity ID</th>
                    <th className="p-3">Details</th>
                    <th className="p-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20">
                      <td className="p-3 text-xs text-muted-foreground">{formatDate(log.createdAt)}</td>
                      <td className="p-3 font-medium">{log.admin?.name ?? log.adminId}</td>
                      <td className="p-3">
                        <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-xs font-medium">{log.entity}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{log.entityId}</td>
                      <td className="p-3 text-xs max-w-xs truncate">{log.detail}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setInspectLog(log)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View State
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {inspectLog && (
        <Dialog open={!!inspectLog} onOpenChange={() => setInspectLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Audit Log Details — {inspectLog.action}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded bg-muted/40 p-3">
                <div>
                  <span className="text-muted-foreground">Admin:</span>{" "}
                  <span className="font-semibold">{inspectLog.admin?.name ?? inspectLog.adminId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>{" "}
                  <span className="font-semibold">{formatDate(inspectLog.createdAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Entity:</span>{" "}
                  <span className="font-semibold">{inspectLog.entity} ({inspectLog.entityId})</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Action:</span>{" "}
                  <span className="font-semibold">{inspectLog.action}</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-muted-foreground">Description</h4>
                <p className="mt-1 font-mono text-sm">{inspectLog.detail}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold text-muted-foreground">Before State</h4>
                  <pre className="mt-1 max-h-48 overflow-y-auto rounded bg-slate-950 p-3 font-mono text-[11px] text-slate-100">
                    {inspectLog.before ? JSON.stringify(inspectLog.before, null, 2) : "null"}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold text-muted-foreground">After State</h4>
                  <pre className="mt-1 max-h-48 overflow-y-auto rounded bg-slate-950 p-3 font-mono text-[11px] text-slate-100">
                    {inspectLog.after ? JSON.stringify(inspectLog.after, null, 2) : "null"}
                  </pre>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

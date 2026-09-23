"use client";

import * as React from "react";
import { toast } from "sonner";

import { ImageThumb } from "@/components/admin/image-thumb";
import { DataTable, type Column } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { ErrorState, LoadingState, EmptyState } from "@/components/admin/state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { patchJSON } from "@/lib/api/mutate";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PlaceSubmission } from "@/lib/types";

type Status = "PENDING" | "APPROVED" | "REJECTED";

export default function SubmissionsPage() {
  const [status, setStatus] = React.useState<Status>("PENDING");
  const { data, loading, error, refetch } = useAdminData<{ submissions: PlaceSubmission[] }>(
    "/admin/api/place-submissions",
    { query: { status } }
  );

  const [rejecting, setRejecting] = React.useState<PlaceSubmission | null>(null);
  const [reason, setReason] = React.useState("");
  const [approving, setApproving] = React.useState<PlaceSubmission | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function approve(submission: PlaceSubmission) {
    setBusy(true);
    try {
      await patchJSON(
        `/${submission.districtId}/services/api/places/admin/approve/${submission.id}`,
        {}
      );
      toast.success("Submission approved");
      setApproving(null);
      refetch();
    } catch (err) {
      toast.error("Approval failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!rejecting) return;
    setBusy(true);
    try {
      await patchJSON(
        `/${rejecting.districtId}/services/api/places/admin/reject/${rejecting.id}`,
        { rejectionReason: reason || undefined }
      );
      toast.success("Submission rejected");
      setRejecting(null);
      setReason("");
      refetch();
    } catch (err) {
      toast.error("Rejection failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<PlaceSubmission>[] = [
    {
      key: "name",
      header: "Place",
      cell: (s) => (
        <div className="flex items-center gap-3">
          <ImageThumb src={s.images?.[0]} alt={s.name} />
          <div>
            <p className="font-medium">{s.name}</p>
            <p className="text-xs text-muted-foreground">
              {s.district?.name ?? "—"}
              {s.district?.state?.name ? ` · ${s.district.state.name}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (s) => <span className="text-muted-foreground">{s.category || "—"}</span>,
    },
    {
      key: "sender",
      header: "Submitted by",
      cell: (s) =>
        s.specificGuide?.full_name ?? s.commonGuide?.full_name ?? (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "created",
      header: "Submitted",
      cell: (s) => <span className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (s) => <StatusBadge status={s.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Place requests"
        subtitle="Place and place-edit submissions that need review."
      />
      <Tabs value={status} onValueChange={(v) => setStatus(v as Status)} className="mb-4">
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !data?.submissions.length ? (
        <EmptyState
          title={`No ${status.toLowerCase()} submissions`}
          description="New submissions will appear here."
        />
      ) : (
        <div className="space-y-3">
          <DataTable
            columns={columns}
            rows={data.submissions}
            footer={
              status === "PENDING" ? (
                <p className="text-xs text-muted-foreground">
                  Review these submissions and approve or reject them.
                </p>
              ) : undefined
            }
          />
          {status === "PENDING" ? (
            <div className="space-y-2">
              {data.submissions.map((s) => (
                <div
                  key={s.id}
                  className="mono-card flex flex-wrap items-center justify-between gap-3 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      {formatCurrency(s.entryfee)}
                    </Badge>
                    {s.place ? <Badge>Edit request</Badge> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejecting(s)}
                      disabled={busy}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="bg-zinc-900 text-white hover:bg-zinc-800"
                      onClick={() => setApproving(s)}
                      disabled={busy}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <AlertDialog open={!!approving} onOpenChange={(o) => !o && setApproving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve “{approving?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates or updates the place in {approving?.district?.name} and marks the
              request as approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-zinc-900 text-white hover:bg-zinc-800"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (approving) void approve(approving);
              }}
            >
              {busy ? "Approving…" : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject “{rejecting?.name}”?</DialogTitle>
            <DialogDescription>
              Optionally provide a reason that will be shown to the submitter.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-500"
              onClick={reject}
              disabled={busy}
            >
              {busy ? "Rejecting…" : "Reject submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
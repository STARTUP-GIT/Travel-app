"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { patchJSON } from "@/lib/api/mutate";
import { formatDate } from "@/lib/utils";
import type { SupportTicket } from "@/lib/types";
import { LifeBuoy, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

export default function TicketsPage() {
  const [filter, setFilter] = React.useState<string>("OPEN");
  const { data, loading, error, refetch } = useAdminData<{ tickets: SupportTicket[] }>(
    "/admin/api/tickets",
    { query: filter !== "ALL" ? { status: filter } : undefined }
  );

  const [selectedTicket, setSelectedTicket] = React.useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleUpdate = async (ticketId: string, status: string, adminReply?: string) => {
    try {
      setSubmitting(true);
      await patchJSON(`/admin/api/tickets/${ticketId}`, { status, adminReply });
      toast.success("Support ticket updated");
      setSelectedTicket(null);
      setReplyText("");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Tickets"
        subtitle="Manage user support requests, respond to inquiries, and resolve issues."
      />

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "ALL"].map((st) => (
          <Button
            key={st}
            size="sm"
            variant={filter === st ? "default" : "outline"}
            onClick={() => setFilter(st)}
            className="capitalize"
          >
            {st.replace("_", " ")}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Ticket List */}
        <div className="mono-card p-4 lg:col-span-1">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <LifeBuoy className="h-4 w-4 text-primary" />
            Tickets Inbox ({data?.tickets?.length ?? 0})
          </h2>

          {loading ? (
            <LoadingState rows={4} />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : !data?.tickets?.length ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No support tickets match the current filter.</p>
          ) : (
            <ul className="space-y-2">
              {data.tickets.map((t) => {
                const active = selectedTicket?.id === t.id;
                return (
                  <li
                    key={t.id}
                    onClick={() => {
                      setSelectedTicket(t);
                      setReplyText(t.adminReply ?? "");
                    }}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      active ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-primary">{t.priority}</span>
                      <span className="text-muted-foreground">{formatDate(t.createdAt)}</span>
                    </div>
                    <h3 className="mt-1 font-medium leading-tight">{t.subject}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">From: {t.user?.name ?? t.userId}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Ticket Detail / Reply Panel */}
        <div className="mono-card p-6 lg:col-span-2">
          {!selectedTicket ? (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm">Select a support ticket from the inbox to view details and respond.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {selectedTicket.priority} PRIORITY
                    </span>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      STATUS: {selectedTicket.status}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-bold">{selectedTicket.subject}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Submitted by {selectedTicket.user?.name ?? selectedTicket.userId} ({selectedTicket.user?.email ?? "—"}) on{" "}
                    {formatDate(selectedTicket.createdAt)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdate(selectedTicket.id, e.target.value, replyText)}
                    className="rounded-md border bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  User Message
                </h3>
                <div className="mt-2 rounded-lg bg-muted/40 p-4 text-sm leading-relaxed">
                  {selectedTicket.message}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Admin Reply
                </h3>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your response to the user..."
                  rows={4}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    disabled={submitting}
                    onClick={() => handleUpdate(selectedTicket.id, "RESOLVED", replyText)}
                    variant="outline"
                  >
                    Save & Mark Resolved
                  </Button>
                  <Button
                    disabled={submitting}
                    onClick={() => handleUpdate(selectedTicket.id, selectedTicket.status, replyText)}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send Reply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

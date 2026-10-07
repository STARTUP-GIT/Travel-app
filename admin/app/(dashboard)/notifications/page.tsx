"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { postJSON } from "@/lib/api/mutate";
import { formatDate } from "@/lib/utils";
import type { AdminNotification } from "@/lib/types";
import { Bell, Send, Users } from "lucide-react";
import { toast } from "sonner";

export default function NotificationsPage() {
  const { data, loading, error, refetch } = useAdminData<{ notifications: AdminNotification[] }>(
    "/admin/api/notifications"
  );

  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [target, setTarget] = React.useState<"EVERYONE" | "ALL_USERS" | "ALL_GUIDES" | "ALL_OWNERS">(
    "EVERYONE"
  );
  const [submitting, setSubmitting] = React.useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }
    try {
      setSubmitting(true);
      await postJSON("/admin/api/notifications", { title: title.trim(), message: message.trim(), target });
      toast.success("Notification broadcast successfully!");
      setTitle("");
      setMessage("");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Broadcast announcements and system notifications to users, guides, or owners."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Compose Card */}
        <div className="mono-card p-6 lg:col-span-1">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Send className="h-5 w-5 text-primary" />
            Compose Broadcast
          </h2>
          <form onSubmit={handleSend} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="target">Target Audience</Label>
              <select
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value as typeof target)}
                className="mt-1 w-full rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="EVERYONE">Everyone (All Apps)</option>
                <option value="ALL_USERS">All Customer Users</option>
                <option value="ALL_GUIDES">All Tour & Specific Guides</option>
                <option value="ALL_OWNERS">All Hotel & Restaurant Owners</option>
              </select>
            </div>

            <div>
              <Label htmlFor="title">Notification Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Scheduled Maintenance / New Feature"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="message">Message Body</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter notification details..."
                rows={4}
                className="mt-1"
                required
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full gap-2">
              <Bell className="h-4 w-4" />
              {submitting ? "Broadcasting…" : "Send Notification"}
            </Button>
          </form>
        </div>

        {/* History Card */}
        <div className="mono-card p-6 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-5 w-5 text-primary" />
            Broadcast History
          </h2>

          {loading ? (
            <LoadingState rows={4} />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : !data?.notifications?.length ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">No broadcast notifications sent yet.</p>
          ) : (
            <ul className="mt-4 divide-y">
              {data.notifications.map((n) => (
                <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {n.target}
                      </span>
                      <h3 className="mt-1 font-semibold">{n.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

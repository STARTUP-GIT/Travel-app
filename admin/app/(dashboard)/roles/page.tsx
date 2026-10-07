"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Badge } from "@/components/ui/badge";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { patchJSON } from "@/lib/api/mutate";
import { formatDate } from "@/lib/utils";
import type { AdminRole, AdminUserRoleItem } from "@/lib/types";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Full system control, version management, and admin team role modification.",
  ADMIN: "Can manage places, hotels, guides, bookings, users, and app configurations.",
  MODERATOR: "Content approval, place submission reviews, and user feedback moderation.",
  SUPPORT: "Support ticket responses, customer inquiry viewing, and booking status updates.",
};

const ROLE_BADGE_COLORS: Record<AdminRole, string> = {
  SUPER_ADMIN: "bg-red-500/10 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400",
  ADMIN: "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400",
  MODERATOR: "bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400",
  SUPPORT: "bg-green-500/10 text-green-600 border-green-200 dark:bg-green-500/20 dark:text-green-400",
};

export default function RolesPage() {
  const { data, loading, error, refetch } = useAdminData<{ admins: AdminUserRoleItem[] }>(
    "/admin/api/admins"
  );
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const handleRoleChange = async (adminId: string, newRole: AdminRole) => {
    try {
      setUpdatingId(adminId);
      await patchJSON(`/admin/api/admins/${adminId}/role`, { role: newRole });
      toast.success("Admin role updated successfully");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage administrative privileges and access levels across team members."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(ROLE_DESCRIPTIONS) as AdminRole[]).map((role) => (
          <div key={role} className="mono-card p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-semibold">{role.replace("_", " ")}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Admin Team Members
        </h2>

        {loading ? (
          <LoadingState rows={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : !data?.admins?.length ? (
          <div className="mono-card p-8 text-center text-muted-foreground">No admin accounts found.</div>
        ) : (
          <div className="mono-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3">Admin</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Joined</th>
                  <th className="p-3">Role</th>
                  <th className="p-3 text-right">Assign Role</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-muted/20">
                    <td className="p-3">
                      <div className="font-medium">{admin.name}</div>
                      <div className="text-xs text-muted-foreground">@{admin.username}</div>
                    </td>
                    <td className="p-3 text-xs">{admin.email}</td>
                    <td className="p-3 text-xs text-muted-foreground">{formatDate(admin.createdAt)}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block rounded-md border px-2.5 py-0.5 text-xs font-medium ${
                          ROLE_BADGE_COLORS[admin.role] ?? ""
                        }`}
                      >
                        {admin.role}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <select
                        value={admin.role}
                        disabled={updatingId === admin.id}
                        onChange={(e) => handleRoleChange(admin.id, e.target.value as AdminRole)}
                        className="rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="SUPPORT">SUPPORT</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

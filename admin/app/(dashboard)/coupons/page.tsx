"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { postJSON, patchJSON, del } from "@/lib/api/mutate";
import { formatDate } from "@/lib/utils";
import type { Coupon } from "@/lib/types";
import { Plus, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CouponsPage() {
  const { data, loading, error, refetch } = useAdminData<{ coupons: Coupon[] }>("/admin/api/coupons");

  const [code, setCode] = React.useState("");
  const [discount, setDiscount] = React.useState<number>(10);
  const [discountType, setDiscountType] = React.useState<"PERCENTAGE" | "FLAT">("PERCENTAGE");
  const [minBookingAmount, setMinBookingAmount] = React.useState<number>(0);
  const [maxUses, setMaxUses] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Coupon code is required");
      return;
    }
    try {
      setSubmitting(true);
      await postJSON("/admin/api/coupons", {
        code: code.trim().toUpperCase(),
        discount: Number(discount),
        discountType,
        minBookingAmount: Number(minBookingAmount),
        maxUses: maxUses.trim() ? Number(maxUses) : null,
      });
      toast.success("Coupon created successfully");
      setCode("");
      setDiscount(10);
      setMinBookingAmount(0);
      setMaxUses("");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create coupon");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      await patchJSON(`/admin/api/coupons/${coupon.id}`, { isActive: !coupon.isActive });
      toast.success(`Coupon marked ${!coupon.isActive ? "active" : "inactive"}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update coupon");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await del(`/admin/api/coupons/${id}`);
      toast.success("Coupon deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete coupon");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons & Discounts"
        subtitle="Create promo codes, manage percentage/flat discounts, and track usage."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create Coupon Card */}
        <div className="mono-card p-6 lg:col-span-1">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Plus className="h-5 w-5 text-primary" />
            Create Promo Coupon
          </h2>

          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="code">Coupon Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER50 / WELCOME10"
                className="mt-1 font-mono uppercase"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="discountType">Discount Type</Label>
                <select
                  id="discountType"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as typeof discountType)}
                  className="mt-1 w-full rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FLAT">Flat Amount ($)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="discount">Discount Value</Label>
                <Input
                  id="discount"
                  type="number"
                  min="1"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="minAmount">Min Booking ($)</Label>
                <Input
                  id="minAmount"
                  type="number"
                  min="0"
                  value={minBookingAmount}
                  onChange={(e) => setMinBookingAmount(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="maxUses">Max Uses (Optional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Unlimited"
                  className="mt-1"
                />
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full gap-2">
              <Ticket className="h-4 w-4" />
              {submitting ? "Saving…" : "Save Coupon"}
            </Button>
          </form>
        </div>

        {/* Coupons List */}
        <div className="mono-card p-6 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Ticket className="h-5 w-5 text-primary" />
            Active Coupons ({data?.coupons?.length ?? 0})
          </h2>

          {loading ? (
            <LoadingState rows={4} />
          ) : error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : !data?.coupons?.length ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">No coupons created yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3">Code</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">Min Amount</th>
                    <th className="p-3">Usage</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="p-3 font-mono font-bold text-primary">{c.code}</td>
                      <td className="p-3 font-semibold">
                        {c.discountType === "PERCENTAGE" ? `${c.discount}% OFF` : `$${c.discount} OFF`}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">${c.minBookingAmount}</td>
                      <td className="p-3 text-xs font-mono">
                        {c.usedCount} / {c.maxUses ? c.maxUses : "∞"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            c.isActive
                              ? "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {c.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggle(c)}
                        >
                          {c.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(c.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

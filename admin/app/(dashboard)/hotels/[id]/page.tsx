"use client";

import { ArrowLeft, Pencil, Star } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { patchJSON } from "@/lib/api/mutate";
import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState, EmptyState } from "@/components/admin/state";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/status-badge";
import { cn } from "@/lib/utils";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { HotelAdmin } from "@/lib/types";

function HField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

type HotelDetail = HotelAdmin & {
  hotelOwner?: { id: string; name: string; email: string; phone_number: string };
};

export default function HotelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { data, loading, error, refetch } = useAdminData<{ hotel: HotelDetail }>(
    `/admin/api/hotels/${id}`
  );

  const hotel = data?.hotel;
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [costPerNight, setCostPerNight] = React.useState("");
  const [rating, setRating] = React.useState("");
  const [profileLogo, setProfileLogo] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [images, setImages] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [booking, setBooking] = React.useState(true);

  React.useEffect(() => {
    if (!hotel) return;
    setName(hotel.name);
    setAddress(hotel.address);
    setCostPerNight(String(hotel.cost_per_night ?? 0));
    setRating(String(hotel.rating ?? ""));
    setProfileLogo(hotel.profile_logo ?? "");
    setDescription(hotel.description ?? "");
    setImages((hotel.images ?? []).join("\n"));
    setPhone(hotel.phone_number ?? "");
    setWhatsapp(hotel.whatsapp_number ?? "");
    setEmail(hotel.email ?? "");
    setWebsite(hotel.website ?? "");
    setBooking(hotel.booking_enabled);
  }, [hotel]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!hotel) return;
    const imageList = images
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const body: Record<string, unknown> = {
      ...(name !== hotel.name ? { name } : {}),
      ...(address !== hotel.address ? { address } : {}),
      ...(profileLogo !== (hotel.profile_logo ?? "")
        ? { profile_logo: profileLogo || null }
        : {}),
      ...(description !== (hotel.description ?? "")
        ? { description: description || null }
        : {}),
      ...(Number(rating) !== hotel.rating
        ? { rating: rating ? Number(rating) : null }
        : {}),
      ...(Number(costPerNight) !== hotel.cost_per_night
        ? { cost_per_night: Number(costPerNight) }
        : {}),
      ...(images !== (hotel.images ?? []).join("\n") ? { images: imageList } : {}),
      ...(phone !== (hotel.phone_number ?? "")
        ? { phone_number: phone || null }
        : {}),
      ...(whatsapp !== (hotel.whatsapp_number ?? "")
        ? { whatsapp_number: whatsapp || null }
        : {}),
      ...(email !== (hotel.email ?? "") ? { email: email || null } : {}),
      ...(website !== (hotel.website ?? "")
        ? { website: website || null }
        : {}),
      ...(booking !== hotel.booking_enabled ? { booking_enabled: booking } : {}),
    };
    if (Object.keys(body).length === 0) {
      toast.info("No changes to save");
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await patchJSON(`/admin/api/hotels/${hotel.id}`, body);
      toast.success("Hotel updated");
      setOpen(false);
      refetch();
    } catch (err) {
      toast.error("Update failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    if (!hotel) return;
    setBusy(true);
    try {
      await patchJSON(`/admin/api/hotels/${hotel.id}/status`, {
        status: "APPROVED",
      });
      toast.success("Hotel approved");
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
    if (!hotel) return;
    setBusy(true);
    try {
      await patchJSON(`/admin/api/hotels/${hotel.id}/status`, {
        status: "REJECTED",
      });
      toast.success("Hotel rejected");
      refetch();
    } catch (err) {
      toast.error("Rejection failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  const actions = (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <StatusBadge status={hotel?.status ?? "PENDING"} />
        {hotel?.status !== "APPROVED" ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={busy}
              onClick={approve}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
              disabled={busy}
              onClick={reject}
            >
              Reject
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            disabled={busy}
            onClick={reject}
          >
            Undo
          </Button>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800">
            <Pencil className="size-4" /> Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit hotel</DialogTitle>
            <DialogDescription>
              Updates apply immediately and are visible to visitors.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <HField label="Name" className="sm:col-span-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </HField>
              <HField label="Address" className="sm:col-span-2">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </HField>
              <HField label="Cost per night (₹)">
                <Input
                  type="number"
                  step="any"
                  value={costPerNight}
                  onChange={(e) => setCostPerNight(e.target.value)}
                  required
                />
              </HField>
              <HField label="Rating (0-5)">
                <Input
                  type="number"
                  step="any"
                  min={0}
                  max={5}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                />
              </HField>
              <HField label="Profile logo URL">
                <Input
                  value={profileLogo}
                  onChange={(e) => setProfileLogo(e.target.value)}
                />
              </HField>
            </div>
            <HField label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </HField>
            <HField label="Image URLs (one per line)">
              <Textarea
                value={images}
                onChange={(e) => setImages(e.target.value)}
                rows={3}
              />
            </HField>
            <div className="grid gap-4 sm:grid-cols-2">
              <HField label="Phone">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </HField>
              <HField label="WhatsApp">
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </HField>
              <HField label="Email">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </HField>
              <HField label="Website">
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </HField>
            </div>
            <HField label="Booking enabled">
              <Button
                type="button"
                variant={booking ? "default" : "outline"}
                size="sm"
                className={cn(
                  !booking &&
                    "border-zinc-300 text-zinc-900 hover:bg-zinc-100",
                  booking && "bg-zinc-900 text-white hover:bg-zinc-800"
                )}
                onClick={() => setBooking((b) => !b)}
              >
                {booking ? "Enabled" : "Disabled"}
              </Button>
            </HField>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-zinc-900 text-white hover:bg-zinc-800"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div>
      <PageHeader
        title={hotel?.name ?? "Hotel"}
        subtitle={hotel?.district?.name ?? "Loading…"}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/hotels">
            <ArrowLeft className="size-4" /> All hotels
          </Link>
        </Button>
        {hotel ? actions : null}
      </PageHeader>

      {loading ? (
        <LoadingState />
      ) : error || !hotel ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="mono-card flex flex-col items-start gap-4 p-5">
            <div className="flex w-full items-center gap-4">
              <ImageThumb
                src={hotel.profile_logo ?? hotel.images?.[0]}
                alt={hotel.name}
                className="size-14 rounded-xl"
              />
              <div>
                <h2 className="text-lg font-bold">{hotel.name}</h2>
                {hotel.rating != null ? (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="size-3.5 fill-current" /> {hotel.rating}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {hotel.booking_enabled ? (
                <Badge className="bg-zinc-900 text-white">Booking enabled</Badge>
              ) : (
                <Badge variant="outline">Bookings off</Badge>
              )}
              <Badge variant="outline">
                {formatCurrency(hotel.cost_per_night)} / night
              </Badge>
            </div>
            <dl className="w-full space-y-2 text-sm">
              <Dt label="Address" value={hotel.address} />
              <Dt label="District" value={hotel.district?.name ?? "—"} />
              <Dt label="Phone" value={hotel.phone_number ?? "—"} />
              <Dt label="WhatsApp" value={hotel.whatsapp_number ?? "—"} />
              <Dt label="Email" value={hotel.email ?? "—"} />
              <Dt label="Website" value={hotel.website ?? "—"} />
              <Dt label="Created" value={formatDate(hotel.createdAt)} />
            </dl>
          </div>

          <div className="space-y-5 lg:col-span-2">
            <div className="mono-card p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">
                {hotel.description || "No description provided."}
              </p>
            </div>

            {hotel.hotelOwner ? (
              <div className="mono-card p-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Owner
                </h3>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{hotel.hotelOwner.name}</span>
                  <span className="text-muted-foreground">
                    {hotel.hotelOwner.email} · {hotel.hotelOwner.phone_number}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mono-card p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Photos ({hotel.images.length})
              </h3>
              {hotel.images.length ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {hotel.images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${src}-${i}`}
                      src={src}
                      alt={`${hotel.name} ${i + 1}`}
                      loading="lazy"
                      className="aspect-square w-full rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No photos"
                  description="This hotel has no photos."
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Dt({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right break-words font-medium">{value}</dd>
    </div>
  );
}

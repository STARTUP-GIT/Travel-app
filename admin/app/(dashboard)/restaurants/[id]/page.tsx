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
import { formatDate } from "@/lib/utils";
import type { RestaurantAdmin } from "@/lib/types";

function RF({
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

type RestaurantDetail = RestaurantAdmin & {
  restaurentOwner?: { id: string; name: string; email: string; phone_number: string };
};

function RestActions({
  restaurant,
  saving,
  setSaving,
  setOpen,
  approve,
  reject,
  name,
  setName,
  address,
  setAddress,
  foodCategory,
  setFoodCategory,
  rating,
  setRating,
  profileLogo,
  setProfileLogo,
  description,
  setDescription,
  menu,
  setMenu,
  images,
  setImages,
  phone,
  setPhone,
  whatsapp,
  setWhatsapp,
  email,
  setEmail,
  website,
  setWebsite,
  booking,
  setBooking,
}: {
  restaurant: RestaurantDetail;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  approve: () => Promise<void>;
  reject: () => Promise<void>;
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  address: string;
  setAddress: React.Dispatch<React.SetStateAction<string>>;
  foodCategory: string;
  setFoodCategory: React.Dispatch<React.SetStateAction<string>>;
  rating: string;
  setRating: React.Dispatch<React.SetStateAction<string>>;
  profileLogo: string;
  setProfileLogo: React.Dispatch<React.SetStateAction<string>>;
  description: string;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  menu: string;
  setMenu: React.Dispatch<React.SetStateAction<string>>;
  images: string;
  setImages: React.Dispatch<React.SetStateAction<string>>;
  phone: string;
  setPhone: React.Dispatch<React.SetStateAction<string>>;
  whatsapp: string;
  setWhatsapp: React.Dispatch<React.SetStateAction<string>>;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  website: string;
  setWebsite: React.Dispatch<React.SetStateAction<string>>;
  booking: boolean;
  setBooking: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <StatusBadge status={restaurant.status ?? "PENDING"} />
        {restaurant.status !== "APPROVED" ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={approve}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
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
            onClick={reject}
          >
            Undo
          </Button>
        )}
      </div>
      <Dialog open={false} onOpenChange={setOpen}>
        {/* Top-level rendered via parent conditional to keep JSX tree flat */}
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800">
            <Pencil className="size-4" /> Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit restaurant</DialogTitle>
            <DialogDescription>
              Updates apply immediately and are visible to visitors.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const imageList = images
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
              const menuList = menu
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
              const body: Record<string, unknown> = {
                ...(name !== restaurant.name ? { name } : {}),
                ...(address !== restaurant.address ? { address } : {}),
                ...(profileLogo !== (restaurant.profile_logo ?? "")
                  ? { profile_logo: profileLogo || null }
                  : {}),
                ...(description !== (restaurant.description ?? "")
                  ? { description: description || null }
                  : {}),
                ...(Number(rating) !== restaurant.rating
                  ? { rating: rating ? Number(rating) : null }
                  : {}),
                ...(foodCategory !== (restaurant.food_category ?? "VEG_AND_NONVEG")
                  ? { food_category: foodCategory as "VEG_AND_NONVEG" | "PUREVEG" | "NONVEG" }
                  : {}),
                ...(menu !== (restaurant.menu ?? []).join("\n")
                  ? { menu: menuList }
                  : {}),
                ...(images !== (restaurant.images ?? []).join("\n")
                  ? { images: imageList }
                  : {}),
                ...(phone !== (restaurant.phone_number ?? "")
                  ? { phone_number: phone || null }
                  : {}),
                ...(whatsapp !== (restaurant.whatsapp_number ?? "")
                  ? { whatsapp_number: whatsapp || null }
                  : {}),
                ...(email !== (restaurant.email ?? "")
                  ? { email: email || null }
                  : {}),
                ...(website !== (restaurant.website ?? "")
                  ? { website: website || null }
                  : {}),
                ...(booking !== restaurant.booking_enabled
                  ? { booking_enabled: booking }
                  : {}),
              };
              if (Object.keys(body).length === 0) {
                toast.info("No changes to save");
                setOpen(false);
                return;
              }
              setSaving(true);
              (async () => {
                try {
                  await patchJSON(`/admin/api/restaurants/${restaurant.id}`, body);
                  toast.success("Restaurant updated");
                  setOpen(false);
                } catch (err) {
                  toast.error("Update failed", {
                    description: err instanceof Error ? err.message : undefined,
                  });
                } finally {
                  setSaving(false);
                }
              })();
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <RF label="Name" className="sm:col-span-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </RF>
              <RF label="Address" className="sm:col-span-2">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </RF>
              <RF label="Food category">
                <select
                  className="h-9 rounded-md border border-input bg-background text-sm"
                  value={foodCategory}
                  onChange={(e) => setFoodCategory(e.target.value)}
                >
                  <option value="PUREVEG">Pure veg</option>
                  <option value="NONVEG">Non-veg</option>
                  <option value="VEG_AND_NONVEG">Veg & non-veg</option>
                </select>
              </RF>
              <RF label="Rating (0-5)">
                <Input
                  type="number"
                  step="any"
                  min={0}
                  max={5}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                />
              </RF>
              <RF label="Profile logo URL">
                <Input
                  value={profileLogo}
                  onChange={(e) => setProfileLogo(e.target.value)}
                />
              </RF>
            </div>
            <RF label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </RF>
            <RF label="Menu items (one per line)">
              <Textarea
                value={menu}
                onChange={(e) => setMenu(e.target.value)}
                rows={3}
              />
            </RF>
            <RF label="Image URLs (one per line)">
              <Textarea
                value={images}
                onChange={(e) => setImages(e.target.value)}
                rows={3}
              />
            </RF>
            <div className="grid gap-4 sm:grid-cols-2">
              <RF label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </RF>
              <RF label="WhatsApp">
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </RF>
              <RF label="Email">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </RF>
              <RF label="Website">
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </RF>
            </div>
            <RF label="Reservations enabled">
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
            </RF>
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
}

export default function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { data, loading, error, refetch } = useAdminData<{
    restaurant: RestaurantDetail;
  }>(`/admin/api/restaurants/${id}`);

  const restaurant = data?.restaurant;
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [foodCategory, setFoodCategory] = React.useState("VEG_AND_NONVEG");
  const [rating, setRating] = React.useState("");
  const [profileLogo, setProfileLogo] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [menu, setMenu] = React.useState("");
  const [images, setImages] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [booking, setBooking] = React.useState(true);

  React.useEffect(() => {
    if (!restaurant) return;
    setName(restaurant.name);
    setAddress(restaurant.address);
    setFoodCategory(restaurant.food_category ?? "VEG_AND_NONVEG");
    setRating(String(restaurant.rating ?? ""));
    setProfileLogo(restaurant.profile_logo ?? "");
    setDescription(restaurant.description ?? "");
    setMenu((restaurant.menu ?? []).join("\n"));
    setImages((restaurant.images ?? []).join("\n"));
    setPhone(restaurant.phone_number ?? "");
    setWhatsapp(restaurant.whatsapp_number ?? "");
    setEmail(restaurant.email ?? "");
    setWebsite(restaurant.website ?? "");
    setBooking(restaurant.booking_enabled);
  }, [restaurant]);

  async function approve() {
    if (!restaurant) return;
    try {
      await patchJSON(`/admin/api/restaurants/${restaurant.id}/status`, {
        status: "APPROVED",
      });
      toast.success("Restaurant approved");
      refetch();
    } catch (err) {
      toast.error("Approval failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function reject() {
    if (!restaurant) return;
    try {
      await patchJSON(`/admin/api/restaurants/${restaurant.id}/status`, {
        status: "REJECTED",
      });
      toast.success("Restaurant rejected");
      refetch();
    } catch (err) {
      toast.error("Rejection failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <div>
      <PageHeader
        title={restaurant?.name ?? "Restaurant"}
        subtitle={restaurant?.district?.name ?? "Loading…"}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/restaurants">
            <ArrowLeft className="size-4" /> All restaurants
          </Link>
        </Button>
        {restaurant ? (
          <RestActions
            restaurant={restaurant}
            saving={saving}
            setSaving={setSaving}
            setOpen={setOpen}
            approve={approve}
            reject={reject}
            name={name}
            setName={setName}
            address={address}
            setAddress={setAddress}
            foodCategory={foodCategory}
            setFoodCategory={setFoodCategory}
            rating={rating}
            setRating={setRating}
            profileLogo={profileLogo}
            setProfileLogo={setProfileLogo}
            description={description}
            setDescription={setDescription}
            menu={menu}
            setMenu={setMenu}
            images={images}
            setImages={setImages}
            phone={phone}
            setPhone={setPhone}
            whatsapp={whatsapp}
            setWhatsapp={setWhatsapp}
            email={email}
            setEmail={setEmail}
            website={website}
            setWebsite={setWebsite}
            booking={booking}
            setBooking={setBooking}
          />
        ) : null}
      </PageHeader>

      {loading ? (
        <LoadingState />
      ) : error || !restaurant ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="mono-card flex flex-col items-start gap-4 p-5">
            <div className="flex w-full items-center gap-4">
              <ImageThumb
                src={restaurant.profile_logo ?? restaurant.images?.[0]}
                alt={restaurant.name}
                className="size-14 rounded-xl"
              />
              <div>
                <h2 className="text-lg font-bold">{restaurant.name}</h2>
                {restaurant.rating != null ? (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="size-3.5 fill-current" /> {restaurant.rating}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {restaurant.booking_enabled ? (
                <Badge className="bg-zinc-900 text-white">Reservations open</Badge>
              ) : (
                <Badge variant="outline">Reservations closed</Badge>
              )}
              <Badge variant="outline">
                {restaurant.food_category?.replace(/_/g, " ").toLowerCase()}
              </Badge>
            </div>
            <dl className="w-full space-y-2 text-sm">
              <Dt label="Address" value={restaurant.address} />
              <Dt label="District" value={restaurant.district?.name ?? "—"} />
              <Dt label="Phone" value={restaurant.phone_number ?? "—"} />
              <Dt label="WhatsApp" value={restaurant.whatsapp_number ?? "—"} />
              <Dt label="Email" value={restaurant.email ?? "—"} />
              <Dt label="Website" value={restaurant.website ?? "—"} />
              <Dt label="Created" value={formatDate(restaurant.createdAt)} />
            </dl>
          </div>

          <div className="space-y-5 lg:col-span-2">
            <div className="mono-card p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">
                {restaurant.description || "No description provided."}
              </p>
            </div>

            {restaurant.menu && restaurant.menu.length > 0 ? (
              <div className="mono-card p-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Menu ({restaurant.menu.length})
                </h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {restaurant.menu.map((item, i) => (
                    <li key={i} className="rounded-lg bg-muted/40 p-3 text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {restaurant.restaurentOwner ? (
              <div className="mono-card p-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Owner
                </h3>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{restaurant.restaurentOwner.name}</span>
                  <span className="text-muted-foreground">
                    {restaurant.restaurentOwner.email} · {restaurant.restaurentOwner.phone_number}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mono-card p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Photos ({restaurant.images.length})
              </h3>
              {restaurant.images.length ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {restaurant.images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${src}-${i}`}
                      src={src}
                      alt={`${restaurant.name} ${i + 1}`}
                      loading="lazy"
                      className="aspect-square w-full rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No photos"
                  description="This restaurant has no photos."
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

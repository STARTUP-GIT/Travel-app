"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { addService, editService } from "@/features/provider/api/provider.actions";
import { emptyVenue, venueSchema } from "@/features/provider/schemas";
import type { VenueValues } from "@/features/provider/schemas";
import { FOOD_CATEGORIES, type ProviderKind } from "@/features/provider/types";
import type { DistrictRef } from "@/features/provider/types";

type Errors = Partial<Record<keyof VenueValues, string>>;

function fieldErrors(error: { flatten(): { fieldErrors: Record<string, string[]> } }) {
  const flat = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(flat).map(([key, messages]) => [key, messages?.[0]])
  ) as Errors;
}

/**
 * One form for both creating and editing a hotel or restaurant. The backend
 * validates the full record on create and every field on update, so the same
 * fields are always submitted and `rating` is left to the API.
 */
export function VenueForm({
  kind,
  districts,
  initial,
  listingId,
  submitLabel,
  bookingEnabled = true,
  images = [],
}: {
  kind: Extract<ProviderKind, "hotel" | "restaurant">;
  districts: DistrictRef[];
  initial?: VenueValues;
  listingId?: string;
  submitLabel: string;
  /** Existing `booking_enabled` value when editing. */
  bookingEnabled?: boolean;
  /** Existing gallery URLs, round-tripped so an edit never clears them. */
  images?: string[];
}) {
  const isHotel = kind === "hotel";
  const [acceptBookings, setAcceptBookings] = React.useState(bookingEnabled);
  const [values, setValues] = React.useState<VenueValues>(initial ?? emptyVenue());
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  function set<K extends keyof VenueValues>(key: K, value: VenueValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = venueSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    setErrors({});
    setBusy(true);

    const input = {
      name: parsed.data.name,
      address: parsed.data.address,
      profileLogo: parsed.data.profileLogo,
      districtId: parsed.data.districtId,
      description: parsed.data.description,
      rating: 0,
      costPerNight: isHotel ? parsed.data.costPerNight : 0,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      phone: parsed.data.phone,
      whatsapp: parsed.data.whatsapp,
      email: parsed.data.email,
      website: parsed.data.website,
      bookingEnabled: acceptBookings,
      images,
      foodCategory: parsed.data.foodCategory,
      menu: isHotel ? [] : parsed.data.menu,
    };

    const result = listingId
      ? await editService(listingId, input)
      : await addService(input);

    setBusy(false);

    if (!result.ok) {
      if (result.fields && Object.keys(result.fields).length > 0) {
        setErrors(result.fields as Errors);
        setFormError(result.message);
        toast.error("Please fix the highlighted fields");
        return;
      }
      setFormError(result.message);
      toast.error(result.message);
      return;
    }

    toast.success(listingId ? "Listing updated" : "Listing created");
    if (!listingId) {
      setValues(emptyVenue());
      setAcceptBookings(true);
    }
  }

  const districtOptions = districts.length
    ? districts
    : values.districtId
      ? [{ id: values.districtId, name: values.districtId }]
      : [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      {formError ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/6 p-4 text-sm"
        >
          <p className="font-semibold">The listing was not saved</p>
          <p className="mt-1 text-muted-foreground">{formError}</p>
        </div>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Basics</h2>

        <Field label={isHotel ? "Hotel name" : "Restaurant name"} error={errors.name}>
          <Input
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder={isHotel ? "Hotel Moonlight" : "Bengaluru Kitchen"}
            aria-invalid={Boolean(errors.name)}
          />
        </Field>

        <Field label="Address" error={errors.address}>
          <Textarea
            value={values.address}
            onChange={(event) => set("address", event.target.value)}
            placeholder="Street, landmark, city"
            rows={2}
            aria-invalid={Boolean(errors.address)}
          />
        </Field>

        <Field
          label="District"
          error={errors.districtId}
          hint="Districts are public and owned by the platform."
        >
          <Select
            value={values.districtId}
            onValueChange={(value) => set("districtId", value)}
          >
            <SelectTrigger aria-invalid={Boolean(errors.districtId)}>
              <SelectValue placeholder="Choose a district" />
            </SelectTrigger>
            <SelectContent>
              {districtOptions.map((district) => (
                <SelectItem key={district.id} value={district.id}>
                  {district.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Cover photo URL"
          error={errors.profileLogo}
          hint="A direct link to the main image, for example from your own uploads."
        >
          <Input
            value={values.profileLogo}
            onChange={(event) => set("profileLogo", event.target.value)}
            placeholder="https://images.example.com/hotel.jpg"
            inputMode="url"
            aria-invalid={Boolean(errors.profileLogo)}
          />
        </Field>

        <Field label="Description" error={errors.description}>
          <Textarea
            value={values.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder={
              isHotel
                ? "Rooms, amenities, check-in times, and what makes a stay memorable."
                : "The kind of food you serve, timings, and what guests can expect."
            }
            rows={4}
            aria-invalid={Boolean(errors.description)}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">
          {isHotel ? "Stay details" : "Food details"}
        </h2>

        {isHotel ? (
          <Field label="Price per night (₹)" error={errors.costPerNight}>
            <Input
              value={values.costPerNight}
              onChange={(event) => set("costPerNight", event.target.value)}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="2400"
              aria-invalid={Boolean(errors.costPerNight)}
            />
          </Field>
        ) : (
          <>
            <Field label="Food category" error={errors.foodCategory}>
              <Select
                value={values.foodCategory}
                onValueChange={(value) =>
                  set("foodCategory", value as VenueValues["foodCategory"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {FOOD_CATEGORIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="flex flex-col gap-2">
              <Label>Menu highlights</Label>
              {values.menu.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={item}
                    onChange={(event) => {
                      const menu = [...values.menu];
                      menu[index] = event.target.value;
                      set("menu", menu);
                    }}
                    placeholder="Masala dosa, filter coffee"
                    aria-label={`Menu item ${index + 1}`}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-9 shrink-0 rounded-full text-destructive"
                    aria-label={`Remove menu item ${index + 1}`}
                    onClick={() =>
                      set(
                        "menu",
                        values.menu.filter((_, position) => position !== index)
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-fit rounded-full"
                onClick={() => set("menu", [...values.menu, ""])}
              >
                <Plus className="size-4" />
                Add a dish
              </Button>
              {errors.menu ? (
                <p className="text-xs text-destructive">{errors.menu}</p>
              ) : null}
            </div>
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude" error={errors.latitude}>
            <Input
              value={values.latitude}
              onChange={(event) => set("latitude", event.target.value)}
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="12.2958"
              aria-invalid={Boolean(errors.latitude)}
            />
          </Field>
          <Field label="Longitude" error={errors.longitude}>
            <Input
              value={values.longitude}
              onChange={(event) => set("longitude", event.target.value)}
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="76.6394"
              aria-invalid={Boolean(errors.longitude)}
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Contact</h2>
        <p className="-mt-2 text-xs text-muted-foreground">
          Optional. Anything you leave blank is simply not shown to travellers.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" error={errors.phone}>
            <Input
              value={values.phone}
              onChange={(event) => set("phone", event.target.value)}
              type="tel"
              placeholder="+91 98765 43210"
              aria-invalid={Boolean(errors.phone)}
            />
          </Field>
          <Field label="WhatsApp" error={errors.whatsapp}>
            <Input
              value={values.whatsapp}
              onChange={(event) => set("whatsapp", event.target.value)}
              type="tel"
              placeholder="+91 98765 43210"
              aria-invalid={Boolean(errors.whatsapp)}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input
              value={values.email}
              onChange={(event) => set("email", event.target.value)}
              type="email"
              placeholder="stay@example.com"
              aria-invalid={Boolean(errors.email)}
            />
          </Field>
          <Field label="Website" error={errors.website}>
            <Input
              value={values.website}
              onChange={(event) => set("website", event.target.value)}
              type="url"
              placeholder="https://example.com"
              aria-invalid={Boolean(errors.website)}
            />
          </Field>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="min-w-0">
          <Label htmlFor="accept-bookings">Accept requests right away</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            You can turn this off at any time from the listings page.
          </p>
        </div>
        <Switch
          id="accept-bookings"
          checked={acceptBookings}
          onCheckedChange={setAcceptBookings}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={busy} className="rounded-full">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {busy ? "Saving…" : submitLabel}
        </Button>
        <p className="text-xs text-muted-foreground">
          New listings are reviewed by the platform before travellers can see
          them.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

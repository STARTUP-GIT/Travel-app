import {
  Award,
  Building2,
  CalendarDays,
  IndianRupee,
  Languages,
  MapPin,
  MessageSquare,
  Star,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";

import { AppImage } from "@/components/shared/app-image";
import { ErrorState, NoticeState } from "@/components/shared/states";
import { GlassCard } from "@/components/shared/glass-card";
import { PageHeader } from "@/components/shared/page-header";
import { Rating } from "@/components/shared/rating";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/features/provider/components/profile-form";
import { TourPackageManager } from "@/features/provider/components/tour-package-manager";
import {
  loadProfile,
  loadTourPackages,
} from "@/features/provider/api/provider.actions";
import { requireProviderSession } from "@/features/provider/state/provider-session";
import { providerMeta } from "@/features/provider/config";
import type { ProviderKind, ProviderLinkedPlace, TourPackage } from "@/features/provider/types";
import { formatCurrency, formatDate, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "My profile" };

/**
 * Only a Common Guide owns tour packages — a Specific Guide is tied to one place
 * by definition — so the section is built from the signed-in kind, never from
 * whatever came back from the API.
 */
type PackagesState =
  | { status: "ready"; packages: TourPackage[] }
  | { status: "error"; message: string };

/**
 * A package failure must not take the rest of the profile down, but it must also
 * not be laundered into "you have no packages": the two are reported separately
 * so the manager can show the empty state in one case and an error in the other.
 */
async function loadPackages(kind: ProviderKind): Promise<PackagesState> {
  if (kind !== "common_guide") return { status: "ready", packages: [] };

  const result = await loadTourPackages().catch((error: unknown) => ({
    packages: [] as TourPackage[],
    error:
      error instanceof Error
        ? error.message
        : "Your tour packages could not be loaded.",
  }));

  return result.error
    ? { status: "error", message: result.error }
    : { status: "ready", packages: result.packages };
}

export default async function ProfilePage() {
  const session = await requireProviderSession("/profile");
  const meta = providerMeta(session.kind);

  const profile = await loadProfile().catch((error: unknown) => {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Your profile could not be loaded.",
    };
  });

  if ("error" in profile) {
    return (
      <div className="app-container mx-auto max-w-5xl">
        <PageHeader title="My profile" />
        <ErrorState
          title="Profile unavailable"
          description={profile.error}
        />
      </div>
    );
  }

  const packages = await loadPackages(session.kind);

  return (
    // `app-container` is full width with gutters and no auto margins, so the
    // `mx-auto` + max width is what centres the whole page instead of pinning it
    // to the left edge. The width is a cap, not a fixed size, so it collapses to
    // the viewport on mobile.
    <div className="app-container mx-auto max-w-5xl">
      <PageHeader
        icon={<UserRound className="size-6" />}
        title="My profile"
        description="What travellers and the platform see about you."
      />

      <div className="flex flex-col gap-4 pb-8">
        <GlassCard className="gap-5 p-5 sm:p-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <AppImage
              src={profile.photo}
              alt={profile.name}
              className="size-20 shrink-0 rounded-full shadow-md ring-4 ring-background sm:size-24"
              fallbackClassName="rounded-full ring-4 ring-background shadow-md"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <h2 className="text-lg font-bold tracking-tight break-words sm:text-xl">
                {profile.name}
              </h2>
              <p className="text-sm text-muted-foreground break-words">
                @{profile.username} · {meta.label}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {profile.authProvider === "google" ? (
                  <Badge variant="info">Google account</Badge>
                ) : null}
                {profile.isReported ? (
                  <Badge variant="destructive">Under review</Badge>
                ) : null}
                <Badge variant="outline">
                  <CalendarDays className="size-3" />
                  Joined {formatDate(profile.createdAt)}
                </Badge>
              </div>
            </div>
          </div>

          {profile.tagline ? (
            <p className="text-sm text-muted-foreground">{profile.tagline}</p>
          ) : null}

          {/*
            A specific guide is linked to exactly one place, so the place is named
            here rather than counted: "1 place" tells the guide nothing about
            which place their profile is attached to.
          */}
          {session.kind === "specific_guide" ? (
            <LinkedPlaceCard place={profile.linkedPlace} />
          ) : null}

          {/*
            Shown only for a common guide that filled the field in. A guide with
            no agency, and every specific guide, gets no agency line at all
            rather than an empty label.
          */}
          {session.kind === "common_guide" && profile.agencyName ? (
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Building2 className="size-4 text-muted-foreground" />
              {profile.agencyName}
            </p>
          ) : null}

          <div className="h-px w-full bg-border" />

          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Fact icon={Star} label="Rating">
              {profile.rating ? (
                <Rating value={profile.rating} size="sm" />
              ) : (
                <span className="text-muted-foreground">No reviews yet</span>
              )}
            </Fact>
            {meta.managesVenues ? null : (
              <Fact icon={IndianRupee} label="Per day">
                {formatCurrency(profile.cost)}
              </Fact>
            )}
            {meta.managesVenues ? null : (
              <Fact icon={Award} label="Experience">
                {pluralize(profile.experience, "year")}
              </Fact>
            )}
            <Fact icon={MessageSquare} label="Reviews">
              {pluralize(profile.reviews.length, "review")}
            </Fact>
          </dl>

          {profile.languages.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                <Languages className="size-3.5" />
                Speaks
              </span>
              {profile.languages.map((language) => (
                <Badge key={language} variant="secondary">
                  {language}
                </Badge>
              ))}
            </div>
          ) : null}

          {/*
            Coverage count, for kinds that can have many places. A specific guide
            is deliberately excluded: it has exactly one linked place, already
            named above, so a "1 place" badge would just repeat it.
          */}
          {session.kind !== "specific_guide" && profile.placeIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                <MapPin className="size-3.5" />
                Registered in
              </span>
              <Badge variant="secondary">
                {pluralize(profile.placeIds.length, "place")}
              </Badge>
            </div>
          ) : null}
        </GlassCard>

        {!meta.managesVenues ? (
          <NoticeState
            title="Places are optional at sign-up"
            description={
              session.kind === "common_guide"
                ? "You could register without choosing a place. Add tour packages below to group the places you cover into named tours — each place in a package is also added to your coverage, so travellers can find and book you there."
                : "You could register without choosing a place. A place guide is linked to one place, and that link is decided at sign-up and cannot be changed from here afterwards. Everything else below you can edit freely."
            }
          />
        ) : null}

        {session.kind === "common_guide" ? (
          <GlassCard className="gap-5 p-5 sm:p-6">
            <TourPackageManager
              packages={packages.status === "ready" ? packages.packages : []}
              error={packages.status === "error" ? packages.message : null}
            />
          </GlassCard>
        ) : null}

        <GlassCard className="gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">Edit your details</h2>
            <p className="text-xs text-muted-foreground">
              Update your public information, photo, and password.
            </p>
          </div>
          <ProfileForm profile={profile} />
        </GlassCard>
      </div>
    </div>
  );
}

/**
 * The place a specific guide is linked to, named in full.
 *
 * Three states, because they need different words: a real place, a place still
 * awaiting review, and no place at all. The middle one matters most — a place
 * that exists but is not live is not the same as having no place, and a guide
 * looking at their profile cannot tell the difference without being told.
 */
function LinkedPlaceCard({ place }: { place: ProviderLinkedPlace | null }) {
  if (!place) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-border bg-muted/30 p-3.5">
        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">No place selected</p>
          <p className="text-xs text-muted-foreground">
            Your profile is not linked to a place yet, so it will not appear on
            any place page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-muted/40 p-3.5">
      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium break-words">{place.name}</p>
          {place.status === "APPROVED" ? null : (
            <Badge variant="warning">
              {place.status === "PENDING" ? "Awaiting review" : "Not live"}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground break-words">
          {[
            place.district?.name,
            place.category,
            place.entryfee === null
              ? "Free entry"
              : `${formatCurrency(place.entryfee)} entry`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </div>
  );
}

function Fact({  icon: Icon,
  label,
  children,
}: {
  icon: typeof Star;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-muted/40 p-4">
      <dt className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className="text-sm font-semibold break-words">{children}</dd>
    </div>
  );
}

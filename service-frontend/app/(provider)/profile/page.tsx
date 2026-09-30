import {
  Award,
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
import { formatCurrency, formatDate, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "My profile" };

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
      <div className="app-container max-w-3xl">
        <PageHeader title="My profile" />
        <ErrorState
          title="Profile unavailable"
          description={profile.error}
        />
      </div>
    );
  }

  // Only a tour guide has packages, and a failure here must not take the rest of
  // the profile down: it falls back to the "unavailable" notice instead.
  const packages =
    session.kind === "common_guide"
      ? await loadTourPackages().catch(() => ({
          packages: [],
          unavailable: true,
        }))
      : { packages: [], unavailable: false };

  return (
    <div className="app-container max-w-3xl">
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

          {profile.placeIds.length > 0 ? (
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
              packages={packages.packages}
              unavailable={packages.unavailable}
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

function Fact({
  icon: Icon,
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

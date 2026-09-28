import { CalendarDays, MapPin, ShieldCheck, Star } from "lucide-react";
import type { Metadata } from "next";

import { AppImage } from "@/components/shared/app-image";
import { ErrorState, NoticeState } from "@/components/shared/states";
import { GlassCard } from "@/components/shared/glass-card";
import { PageHeader } from "@/components/shared/page-header";
import { Rating } from "@/components/shared/rating";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/features/provider/components/profile-form";
import { loadProfile } from "@/features/provider/api/provider.actions";
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
      <div className="app-container max-w-2xl">
        <PageHeader title="My profile" />
        <ErrorState
          title="Profile unavailable"
          description={profile.error}
        />
      </div>
    );
  }

  return (
    <div className="app-container max-w-2xl">
      <PageHeader
        title="My profile"
        description="What travellers and the platform see about you."
      />

      <GlassCard className="mb-6 gap-4 p-4">
        <div className="flex items-center gap-3">
          <AppImage
            src={profile.photo}
            alt={profile.name}
            className="size-16 shrink-0 rounded-full"
            fallbackClassName="rounded-full"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{profile.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              @{profile.username} · {meta.label}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Fact icon={Star} label="Rating">
            {profile.rating ? (
              <Rating value={profile.rating} size="sm" />
            ) : (
              "No reviews yet"
            )}
          </Fact>
          {meta.managesVenues ? null : (
            <Fact icon={Star} label="Per day">
              {formatCurrency(profile.cost)}
            </Fact>
          )}
          {meta.managesVenues ? null : (
            <Fact icon={Star} label="Experience">
              {pluralize(profile.experience, "year")}
            </Fact>
          )}
          <Fact icon={ShieldCheck} label="Reviews">
            {pluralize(profile.reviews.length, "review")}
          </Fact>
        </dl>

        {profile.languages.length > 0 ? (
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            Speaks {profile.languages.join(", ")}
          </p>
        ) : null}

        {profile.placeIds.length > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            Registered in {pluralize(profile.placeIds.length, "place")}
          </p>
        ) : null}
      </GlassCard>

      {!meta.managesVenues ? (
        <NoticeState
          className="mb-6"
          title="Places are fixed at registration"
          description="Which places or district you cover is decided when you sign up, because the backend does not allow it to be changed afterwards. Everything else below you can edit freely."
        />
      ) : null}

      <ProfileForm profile={profile} />
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
    <div className="rounded-xl bg-muted/60 p-3">
      <dt className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{children}</dd>
    </div>
  );
}

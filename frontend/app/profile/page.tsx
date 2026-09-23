"use client";

import * as React from "react";
import {
  Bookmark,
  CalendarDays,
  Flag,
  Info,
  LogOut,
  MapPin,
  Pencil,
} from "lucide-react";
import Link from "next/link";

import { AuthGate } from "@/components/shared/auth-gate";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCurrentDistrict } from "@/features/locations/state/current-district-provider";
import { EditProfileDialog } from "@/features/profile/components/edit-profile-dialog";
import { useProfile } from "@/features/profile/hooks/useProfile";
import type { CustomerProfile } from "@/features/profile/types";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { slug, stateSlug } = useCurrentDistrict();
  const { data: fetchedProfile } = useProfile();

  // Fresh profile from the backend; a successful save takes precedence so the
  // header updates instantly (no effect needed — derived state).
  const [savedProfile, setSavedProfile] = React.useState<CustomerProfile | null>(null);
  const profile = savedProfile ?? fetchedProfile ?? null;

  const [editing, setEditing] = React.useState(false);

  const displayName = profile?.name ?? user?.name ?? "Karnataka traveller";
  const username = profile?.username ?? "";
  const displayEmail = profile?.email ?? user?.email ?? "Signed in";
  const photo = profile?.profilepic ?? user?.image ?? undefined;

  const links = [
    { href: "/favorites", label: "Saved places & guides", desc: "Your favourites", icon: Bookmark },
    { href: "/bookings", label: "My bookings", desc: "Guides, hotels & restaurants", icon: CalendarDays },
    { href: "/report", label: "Report a problem", desc: "Feedback or an issue", icon: Flag },
    { href: "/about", label: "About the app", desc: "How this guide works", icon: Info },
  ];

  return (
    <AuthGate title="Sign in to see your profile" description="Your saved list, bookings and report options live here.">
      <div className="pb-6">
        <ScreenHeader title="Profile" subtitle="Your Karnataka Tourism Guide account" />

        <div className="app-container">
          {/* User card */}
          <div className="card-surface flex items-center gap-4 rounded-3xl p-5">
            <Avatar className="size-16">
              {photo ? <AvatarImage src={photo} alt={displayName} /> : null}
              <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold">{displayName}</h1>
              {username ? (
                <p className="truncate text-sm text-muted-foreground">@{username}</p>
              ) : null}
              <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {/* Edit Profile action */}
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={!profile}
              className="card-surface group flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:border-primary/40 disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Pencil className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Edit Profile</span>
                <span className="block truncate text-xs text-muted-foreground">
                  Update your name, username &amp; photo
                </span>
              </span>
            </button>

            {links.map(({ href, label, desc, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="card-surface group flex items-center gap-3 rounded-2xl p-4 transition-colors hover:border-primary/40"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{desc}</span>
                </span>
              </Link>
            ))}
          </div>

          {slug ? (
            <Link
              href={stateSlug ? `/${stateSlug}/${slug}` : `/${slug}`}
              className="card-surface group mt-2.5 flex items-center gap-3 rounded-2xl p-4 transition-colors hover:border-primary/40"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/12 text-emerald-700">
                <MapPin className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Current district</span>
                <span className="block truncate text-xs text-muted-foreground">Browsing {slug} — tap to change</span>
              </span>
            </Link>
          ) : null}

          <Button
            variant="outline"
            className="mt-6 w-full rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => logout()}
          >
            <LogOut className="size-4" /> Log out
          </Button>
        </div>

        {profile ? (
          <EditProfileDialog
            profile={profile}
            open={editing}
            onOpenChange={setEditing}
            onSaved={(updated) => setSavedProfile(updated)}
          />
        ) : null}
      </div>
    </AuthGate>
  );
}

import { KeyRound, Link2, ShieldAlert, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DeleteAccountButton,
  SignOutButton,
} from "@/features/provider/components/account-actions";
import { loadProfile } from "@/features/provider/api/provider.actions";
import { requireProviderSession } from "@/features/provider/state/provider-session";
import { providerMeta } from "@/features/provider/config";
import { getApiBaseUrl } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireProviderSession("/settings");
  const meta = providerMeta(session.kind);

  const profile = await loadProfile().catch(() => null);

  return (
    <div className="app-container max-w-2xl">
      <PageHeader
        title="Settings"
        description="Your account, how you sign in, and where to leave the app."
      />

      <GlassCard className="mb-4 gap-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Signed in as</p>
            <p className="truncate text-sm text-muted-foreground">
              {session.email}
            </p>
          </div>
          <Badge variant="info">{meta.label}</Badge>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              <KeyRound className="size-3" />
              Sign-in method
            </dt>
            <dd className="mt-1 font-medium">
              {profile?.authProvider === "google" ? "Google" : "Email and password"}
            </dd>
          </div>

          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              <Link2 className="size-3" />
              Connected service
            </dt>
            <dd className="mt-1 break-all font-mono text-xs">
              {getApiBaseUrl()}
            </dd>
          </div>
        </dl>

        {profile ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Store className="size-3.5" />
            Account created {formatDate(profile.createdAt)}
          </p>
        ) : null}
      </GlassCard>

      {meta.managesVenues ? (
        <GlassCard className="mb-4 gap-3 p-4">
          <p className="text-sm font-semibold">Your listings</p>
          <p className="text-xs text-muted-foreground">
            Add, edit, pause, or delete the properties and tables you publish.
          </p>
          <Button asChild variant="outline" className="w-fit rounded-full">
            <Link href="/services">Manage listings</Link>
          </Button>
        </GlassCard>
      ) : null}

      <GlassCard className="mb-4 gap-3 p-4">
        <p className="text-sm font-semibold">Session</p>
        <p className="text-xs text-muted-foreground">
          You stay signed in until you sign out or clear your browser data.
        </p>
        <SignOutButton />
      </GlassCard>

      <GlassCard className="gap-3 border-destructive/30 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <ShieldAlert className="size-4" />
          Danger zone
        </p>
        <p className="text-xs text-muted-foreground">
          Deleting your account removes your profile, listings, and all requests
          permanently. This cannot be undone.
        </p>
        <DeleteAccountButton />
      </GlassCard>
    </div>
  );
}

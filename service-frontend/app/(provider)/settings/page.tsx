import {
  CalendarDays,
  KeyRound,
  LogOut,
  ShieldAlert,
  Store,
  UserRound,
} from "lucide-react";
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
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireProviderSession("/settings");
  const meta = providerMeta(session.kind);

  const profile = await loadProfile().catch(() => null);

  return (
    <div className="app-container max-w-3xl">
      <PageHeader
        icon={<UserRound className="size-6" />}
        title="Settings"
        description="Your account, how you sign in, and where to leave the app."
      />

      <div className="flex flex-col gap-4 pb-8">
        <GlassCard className="gap-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Signed in as
              </p>
              <p className="mt-1.5 text-base font-semibold break-words sm:text-lg">
                {session.email}
              </p>
            </div>
            <Badge variant="info" className="px-2.5 py-1 text-xs font-semibold">
              {meta.label}
            </Badge>
          </div>

          <div className="h-px w-full bg-border" />

          <dl className="grid gap-3 sm:grid-cols-2">
            <Detail
              icon={KeyRound}
              label="Sign-in method"
              value={
                profile?.authProvider === "google" ? "Google" : "Email and password"
              }
            />
            {profile ? (
              <Detail
                icon={CalendarDays}
                label="Account created"
                value={formatDate(profile.createdAt)}
              />
            ) : null}
          </dl>
        </GlassCard>

        {meta.managesVenues ? (
          <GlassCard className="gap-4 p-5 sm:p-6">
            <SectionHeading
              icon={Store}
              title="Your listings"
              description="Add, edit, pause, or delete the properties and tables you publish."
            />
            <Button asChild variant="outline" className="w-fit rounded-full">
              <Link href="/services">Manage listings</Link>
            </Button>
          </GlassCard>
        ) : null}

        <GlassCard className="gap-4 p-5 sm:p-6">
          <SectionHeading
            icon={LogOut}
            title="Session"
            description="You stay signed in until you sign out or clear your browser data."
          />
          <SignOutButton />
        </GlassCard>

        <GlassCard className="gap-4 border-destructive/30 p-5 sm:p-6">
          <SectionHeading
            icon={ShieldAlert}
            title="Danger zone"
            description="Deleting your account removes your profile, listings, and all requests permanently. This cannot be undone."
            tone="destructive"
          />
          <DeleteAccountButton />
        </GlassCard>
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
  tone = "default",
}: {
  icon: typeof LogOut;
  title: string;
  description: string;
  tone?: "default" | "destructive";
}) {
  const destructive = tone === "destructive";

  return (
    <div className="flex flex-col gap-1.5">
      <p
        className={cn(
          "flex items-center gap-2.5 text-sm font-semibold",
          destructive && "text-destructive"
        )}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
            destructive && "bg-destructive/12 text-destructive"
          )}
        >
          <Icon className="size-4" />
        </span>
        {title}
      </p>
      <p className="text-xs text-muted-foreground sm:text-[0.8rem]">
        {description}
      </p>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof LogOut;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-muted/40 p-4">
      <dt className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className="text-sm font-medium break-words">{value}</dd>
    </div>
  );
}

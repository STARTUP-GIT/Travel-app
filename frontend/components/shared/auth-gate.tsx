"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/loading-state";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * Guards a client page that requires an authenticated customer session.
 * Shows a loading skeleton while the session is being resolved and a login
 * prompt when the visitor is signed out.
 */
export function AuthGate({
  children,
  title = "Sign in required",
  description = "You need to be signed in to view this page.",
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState label="Checking session…" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10">
        <GlassCard className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-white/5">
            <LogIn className="size-8 text-sky-300" />
          </span>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="glass">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return <>{children}</>;
}
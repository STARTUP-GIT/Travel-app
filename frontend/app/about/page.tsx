import type { Metadata } from "next";
import { Compass, Heart, MapPin, Route, ShieldCheck, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { ScreenHeader } from "@/components/shared/screen-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { getAppConfig } from "@/features/app-config/api/app-config.api";
import { FALLBACK_CONFIG } from "@/features/app-config/types";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getAppConfig().catch(() => null);
  const appName = config?.app_name || FALLBACK_CONFIG.app_name;
  return {
    title: `About · ${appName}`,
    description: `How the ${appName} app works, what partners it connects you with, and how your data is used.`,
  };
}

const FEATURES = [
  {
    icon: MapPin,
    title: "Famous places",
    desc: "District-by-district listings of places to visit with photos, entry fees and locations, with real device directions.",
  },
  {
    icon: Compass,
    title: "Local guides",
    desc: "Specific guides who know one place deeply, and common guides who can take you across several places in a trip.",
  },
  {
    icon: UtensilsCrossed,
    title: "Hotels & restaurants",
    desc: "Verified stays and eateries with direct booking and reservation requests through the guide's operators.",
  },
  {
    icon: Route,
    title: "Path tracker",
    desc: "Track your journey in real time using your phone's GPS — never simulated.",
  },
  {
    icon: Heart,
    title: "Saved list",
    desc: "Keep favourite places and guides handy for planning across devices in one place.",
  },
  {
    icon: ShieldCheck,
    title: "Respectful & honest",
    desc: "No fake reviews, no invented listings, and you can report anything that looks wrong.",
  },
];

export default async function AboutPage() {
  const config = await getAppConfig().catch(() => null);
  const appName = config?.app_name || FALLBACK_CONFIG.app_name;
  const webTitle = config?.webTitle || FALLBACK_CONFIG.webTitle;

  return (
    <div className="pb-6">
      <ScreenHeader title="About" subtitle={appName} />

      <div className="app-container">
        <div className="card-surface flex flex-col items-center gap-4 rounded-3xl p-6 text-center">
          <LogoMark />
          <div>
            <h1 className="text-xl font-bold tracking-tight">{appName}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{webTitle}</p>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            A mobile-first guide to Karnataka for travellers who want real places, real
            local guides and a route that actually works on the ground.
          </p>
        </div>

        <div className="mt-8 space-y-8">
          <section>
            <SectionHeader title="What you can do" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="card-surface flex items-start gap-3 rounded-2xl p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeader title="How booking works" />
            <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
              <p>
                Guides, hotels and restaurants are verified by the {appName}{" "}
                team. When you book, the request goes to the service provider, who confirms
                it before anything is final.
              </p>
              <p>
                <strong className="text-foreground">Transport fares are distance-based estimates.</strong>{" "}
                You pay your driver directly — the app never handles payments.
              </p>
              <p>
                <strong className="text-foreground">Path tracking uses your real GPS position</strong>{" "}
                on this device only. It is never sent anywhere unless a server track is added later.
              </p>
            </div>
          </section>

          <section className="card-surface rounded-3xl p-5 text-sm text-muted-foreground">
            <h3 className="text-sm font-semibold text-foreground">Privacy, plainly</h3>
            <p className="mt-1.5 leading-relaxed">
              Your saved list, favourites and reports are stored locally on this device.
              Location is used only when you start path tracking or request a fare estimate.
              We never invent data that isn't in the backend.
            </p>
          </section>

          <div className="flex flex-col gap-2 pb-4 sm:flex-row">
            <Button asChild variant="action" className="flex-1 rounded-xl">
              <Link href="/explore">Start exploring</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 rounded-xl">
              <Link href="/report">Report a problem</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoMark() {
  return <Logo className="text-6xl" />;
}
"use client";

import * as React from "react";
import { CheckCircle2, Flag, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { ScreenHeader } from "@/components/shared/screen-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveReport } from "@/features/reports/api/reports.api";
import type { ReportTopic } from "@/features/reports/types";

const TOPICS: { value: ReportTopic; label: string }[] = [
  { value: "place", label: "A place" },
  { value: "guide", label: "A guide" },
  { value: "hotel", label: "A hotel" },
  { value: "restaurant", label: "A restaurant" },
  { value: "app", label: "The app" },
  { value: "other", label: "Something else" },
];

export default function ReportScreen() {
  const searchParams = useSearchParams();
  const prefilledType = searchParams.get("type");
  const prefilledId = searchParams.get("id");

  const [topic, setTopic] = React.useState<ReportTopic>(
    prefilledType && TOPICS.some((t) => t.value === prefilledType)
      ? (prefilledType as ReportTopic)
      : "other"
  );
  const [description, setDescription] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) {
      toast.error("Please describe the issue in a little more detail");
      return;
    }
    saveReport({
      id: crypto.randomUUID(),
      topic,
      description: description.trim(),
      refType: prefilledType ?? undefined,
      refId: prefilledId ?? undefined,
      contact: contact.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    toast.success("Report received", { description: "Thanks for helping keep the guide accurate." });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="pb-6">
        <ScreenHeader title="Report" />
        <div className="app-container">
          <div className="mx-auto mt-6 flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-border bg-card p-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
              <CheckCircle2 className="size-8" />
            </span>
            <h1 className="text-lg font-bold">Thanks — we got it</h1>
            <p className="text-sm text-muted-foreground">
              Reports are recorded on this device for now. Once the backend report
              channel is connected, your report will reach the Karnataka Tourism
              Guide team directly.
            </p>
            <Button variant="outline" className="rounded-xl" onClick={() => setSubmitted(false)}>
              Report another issue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <ScreenHeader title="Report a problem" subtitle="Help us keep listings accurate" />

      <div className="app-container">
        <form onSubmit={submit} className="mx-auto mt-2 flex w-full max-w-md flex-col gap-5">
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <p>
              Reports are private. You can flag outdated details, wrong contact
              information or misleading photos for a place, guide, hotel or restaurant.
              {prefilledId ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Attached reference: {prefilledType ?? "resource"} · {prefilledId}
                </span>
              ) : null}
            </p>
          </div>

          <div className="space-y-2">
            <Label>What’s this about?</Label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Report topic">
              {TOPICS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTopic(t.value)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    topic === t.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-desc">Describe the issue</Label>
            <Textarea
              id="report-desc"
              rows={5}
              placeholder="E.g. the opening time on this place is out of date…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-contact">
              Contact <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="report-contact"
              type="text"
              placeholder="Email or phone so we can follow up"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="rounded-xl py-5"
            />
          </div>

          <Button type="submit" variant="action" size="lg" className="w-full rounded-2xl">
            <Flag className="size-5" /> Submit report
          </Button>
        </form>
      </div>
    </div>
  );
}
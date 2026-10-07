/**
 * Report / feedback persistence.
 *
 * The backend has no public report endpoint — only admin-side `isReported` flags on
 * guides — and the customer web frontend records submissions locally for exactly
 * the same reason. This module mirrors that behaviour so the mobile app does not
 * invent an API the server does not have.
 *
 * It is deliberately the single seam: when a report endpoint is added, only this
 * file changes and the screens above it do not.
 */

import { KEYS, storage } from "@/lib/storage/local-store";

export type ReportTopic = "place" | "guide" | "hotel" | "restaurant" | "app" | "other";

export type ReportIssue = {
  id: string;
  topic: ReportTopic;
  description: string;
  /** What was reported, e.g. a place name — free text, not a foreign key. */
  refType?: string;
  refId?: string;
  contact?: string;
  createdAt: string;
};

export const REPORT_TOPICS: { id: ReportTopic; label: string }[] = [
  { id: "place", label: "A place" },
  { id: "guide", label: "A guide" },
  { id: "hotel", label: "A hotel" },
  { id: "restaurant", label: "A restaurant" },
  { id: "app", label: "Something in the app" },
  { id: "other", label: "Something else" },
];

export function reportTopicLabel(topic: string): string {
  return REPORT_TOPICS.find((item) => item.id === topic)?.label ?? "Report";
}

export async function saveReport(input: Omit<ReportIssue, "id" | "createdAt">): Promise<ReportIssue> {
  const createdAt = new Date().toISOString();
  const report: ReportIssue = { ...input, id: `${createdAt}-${input.topic}`, createdAt };

  const all = await listReports();
  await storage.writeJson(KEYS.reports, [report, ...all]);
  return report;
}

export async function listReports(): Promise<ReportIssue[]> {
  const all = await storage.readJson<ReportIssue[]>(KEYS.reports, []);
  return Array.isArray(all) ? all : [];
}

export async function clearReports(): Promise<void> {
  await storage.writeJson(KEYS.reports, []);
}
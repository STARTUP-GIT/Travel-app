import type { ReportIssue } from "@/features/reports/types";

const STORAGE_KEY = "kt-reports";

/**
 * Report / feedback persistence. The backend does not expose a public report
 * endpoint yet, so submissions are recorded locally for now. This module is
 * the seam where a server-backed reporter can be plugged in later.
 */
export function saveReport(report: ReportIssue): ReportIssue {
  try {
    const all = listReports();
    all.unshift(report);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable
  }
  return report;
}

export function listReports(): ReportIssue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReportIssue[]) : [];
  } catch {
    return [];
  }
}
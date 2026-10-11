import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats calendar dates as DD/MM/YYYY without timezone shifts.
 * Handles "YYYY-MM-DD", ISO timestamps, or Date instances.
 * Example: "2026-10-10" -> "10/10/2026"
 */
export function formatBookingDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";
    // Check if starts with YYYY-MM-DD (safe from UTC-local day shifting)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${d}/${m}/${y}`;
    }
    // Check if already DD/MM/YYYY
    const ddmmyyyyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyyMatch) return trimmed;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/** Consistently format dates to DD/MM/YYYY across all screens and documents. */
export function formatDate(value: string | Date | null | undefined): string {
  return formatBookingDate(value);
}

/** Compact form for list rows and badges, also DD/MM/YYYY. */
export function formatShortDate(value: string | Date | null | undefined): string {
  return formatBookingDate(value);
}

/**
 * Formats time values into Indian Standard Time (IST) 12-hour clock with AM/PM.
 * Example: "09:00" -> "09:00 AM", "14:30" -> "02:30 PM", "00:00" -> "12:00 AM"
 */
export function formatBookingTime(value: string | Date | null | undefined): string {
  if (!value) return "—";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";

    // Format: "9:00 AM", "09:00 am", "2:30 PM"
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)$/i);
    if (ampmMatch) {
      const h = parseInt(ampmMatch[1], 10);
      const m = ampmMatch[2];
      const p = ampmMatch[3].toUpperCase();
      return `${String(h).padStart(2, "0")}:${m} ${p}`;
    }

    // Format: "09:00", "14:30", "00:00", "09:00:00" (already IST local time)
    const time24Match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (time24Match) {
      const hours24 = parseInt(time24Match[1], 10);
      const minutes = time24Match[2];
      if (hours24 >= 0 && hours24 < 24) {
        const ampm = hours24 >= 12 ? "PM" : "AM";
        const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
        return `${String(hours12).padStart(2, "0")}:${minutes} ${ampm}`;
      }
    }

    // ISO timestamp string, e.g. "2026-10-10T09:00:00.000Z"
    const dateObj = new Date(trimmed);
    if (!Number.isNaN(dateObj.getTime()) && trimmed.includes("T")) {
      const parts = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }).formatToParts(dateObj);
      const hour = parts.find((p) => p.type === "hour")?.value ?? "12";
      const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
      const dayPeriod = (parts.find((p) => p.type === "dayPeriod")?.value ?? "AM").toUpperCase();
      return `${hour.padStart(2, "0")}:${minute} ${dayPeriod}`;
    }

    return trimmed;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).formatToParts(value);
    const hour = parts.find((p) => p.type === "hour")?.value ?? "12";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    const dayPeriod = (parts.find((p) => p.type === "dayPeriod")?.value ?? "AM").toUpperCase();
    return `${hour.padStart(2, "0")}:${minute} ${dayPeriod}`;
  }

  return "—";
}

/** Consistent authoritative booking reference code, e.g. KTG-ABCD1234 */
export function formatBookingRef(id: string | null | undefined): string {
  if (!id) return "KTG-UNKNOWN";
  return `KTG-${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

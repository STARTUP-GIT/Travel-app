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

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Format a booking date safely into human-readable "10 Oct 2026".
 *
 * Handles:
 * - "YYYY-MM-DD" date-only strings without timezone conversion
 * - ISO timestamps like "2026-10-10T00:00:00.000Z" preserving calendar date
 * - Safe fallback "—" for null, undefined, empty string, or invalid date values
 */
export function formatBookingDate(value: string | Date | null | undefined): string {
  if (!value) return "—";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return "—";

    // 1. Matches "YYYY-MM-DD" or ISO strings like "YYYY-MM-DDT..."
    // Read the calendar date directly to prevent timezone day-shift
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10);
      const day = parseInt(ymdMatch[3], 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
      }
    }

    // 2. Matches "DD/MM/YYYY" or "DD-MM-YYYY"
    const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
      }
    }

    // 3. Already formatted like "10 Oct 2026" or "10 October 2026"
    const alreadyFormattedMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
    if (alreadyFormattedMatch) {
      const day = parseInt(alreadyFormattedMatch[1], 10);
      const monthStr = alreadyFormattedMatch[2].slice(0, 3).toLowerCase();
      const year = parseInt(alreadyFormattedMatch[3], 10);
      const monthIdx = MONTH_NAMES.findIndex((m) => m.toLowerCase() === monthStr);
      if (monthIdx !== -1) {
        return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
      }
    }

    // 4. Try parsing as a Date string
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      return "—";
    }
    const day = parsed.getDate();
    const month = parsed.getMonth();
    const year = parsed.getFullYear();
    return `${day} ${MONTH_NAMES[month]} ${year}`;
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "—";
    const day = value.getDate();
    const month = value.getMonth();
    const year = value.getFullYear();
    return `${day} ${MONTH_NAMES[month]} ${year}`;
  }

  return "—";
}
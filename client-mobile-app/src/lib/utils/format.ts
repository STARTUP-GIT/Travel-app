/**
 * Presentation formatting.
 *
 * Every number, date and currency string shown to a user is produced here, so
 * an "unknown" value looks the same everywhere instead of appearing as `NaN`,
 * `Invalid Date` or an empty gap in one screen only.
 */

const RUPEE = "₹";

/** Formats an amount with Indian digit grouping. Returns null when unusable. */
export function formatCurrency(amount: number | null | undefined): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  try {
    return `${RUPEE}${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  } catch {
    return `${RUPEE}${Math.round(amount)}`;
  }
}

export function formatNumber(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  try {
    return value.toLocaleString("en-IN");
  } catch {
    return String(Math.round(value));
  }
}

const toDate = (value: Date | string | number): Date | null => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function formatDate(value: Date | string | number | null | undefined): string {
  const date = toDate(value ?? null as never);
  if (!date) return "—";
  try {
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatDateTime(value: Date | string | number | null | undefined): string {
  const date = toDate(value ?? null as never);
  if (!date) return "—";
  try {
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return date.toISOString();
  }
}

export function formatTime(value: Date | string | number | null | undefined): string {
  const date = toDate(value ?? null as never);
  if (!date) return "—";
  try {
    return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  } catch {
    return date.toISOString().slice(11, 16);
  }
}

/** `YYYY-MM-DD` in local time — the shape the backend's `z.coerce.date()` wants. */
export function toIsoDateOnly(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/** Nights between two dates, floored at 1 so a same-day pair is still bookable. */
export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.setHours(12, 0, 0, 0) - checkIn.setHours(12, 0, 0, 0);
  return Math.max(1, Math.round(ms / 86_400_000));
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 2 : 1)} km`;
}

/** `2 h 14 min` style elapsed time for tracking sessions. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}

/** `12 km/h` — the tracking speed readout. */
export function formatSpeed(metersPerSecond: number): string {
  if (!Number.isFinite(metersPerSecond) || metersPerSecond < 0) return "—";
  return `${((metersPerSecond * 3.6)).toFixed(1)} km/h`;
}

/**
 * First image of a listing, or null.
 *
 * `expo-image` renders a neutral placeholder for null, so no screen has to
 * invent a stock photo when a record has none.
 */
export function firstImage(images: string[] | null | undefined): string | null {
  if (!Array.isArray(images)) return null;
  return images.find((url) => typeof url === "string" && url.trim().length > 0) ?? null;
}

/** Trims and caps a free-text field, adding an ellipsis when shortened. */
export function truncate(text: string | null | undefined, max: number): string {
  if (typeof text !== "string") return "";
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function initials(name: string | null | undefined): string {
  if (typeof name !== "string" || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
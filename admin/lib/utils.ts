import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function parseGoogleMapsUrl(url: string): { latitude: number; longitude: number } | null {
  if (!url) return null;
  const normalized = url.trim();

  try {
    const parsedUrl = new URL(normalized);
    const isGoogleHost =
      parsedUrl.hostname === "maps.app.goo.gl" ||
      parsedUrl.hostname === "goo.gl" ||
      /(^|\.)google\.(com|[a-z]{2,3}(?:\.[a-z]{2})?)$/i.test(parsedUrl.hostname);
    if (!isGoogleHost || !parsedUrl.pathname.toLowerCase().includes("map")) return null;
  } catch {
    return null;
  }

  const coordinatePatterns = [
    /@(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/i,
    /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/i,
  ];
  for (const pattern of coordinatePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const coordinates = validCoordinates(Number(match[1]), Number(match[2]));
      if (coordinates) return coordinates;
    }
  }

  try {
    const params = new URL(normalized);
    const coordinateText =
      params.searchParams.get("q") ??
      params.searchParams.get("query") ??
      params.searchParams.get("ll") ??
      params.searchParams.get("center");
    if (coordinateText) {
      const match = coordinateText.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (match) {
        const coordinates = validCoordinates(Number(match[1]), Number(match[2]));
        if (coordinates) return coordinates;
      }
    }

    const latitudeText = params.searchParams.get("lat") ?? params.searchParams.get("latitude");
    const longitudeText =
      params.searchParams.get("lng") ??
      params.searchParams.get("lon") ??
      params.searchParams.get("longitude");
    if (latitudeText && longitudeText) {
      const coordinates = validCoordinates(Number(latitudeText), Number(longitudeText));
      if (coordinates) return coordinates;
    }
  } catch {
    // Fall through to a text-based parse below.
  }

  return null;
}

function validCoordinates(latitude: number, longitude: number) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

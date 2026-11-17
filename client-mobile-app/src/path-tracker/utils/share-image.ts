import { formatDistance, formatDuration, formatSpeed } from './geo';

// ── Trip Stats for Share Image ─────────────────────────────────────────────

export function getShareStats(
  distanceMeters: number,
  durationMs: number
): { distance: string; duration: string; speed: string } {
  return {
    distance: formatDistance(distanceMeters),
    duration: formatDuration(durationMs),
    speed: formatSpeed(distanceMeters, durationMs),
  };
}

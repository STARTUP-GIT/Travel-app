import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import { tripEngine } from './trip-service';
import { filterFix, getLastFix } from './location-service';
import { Branding } from '../constants/theme';

export const BG_TRIP_TASK = Branding.backgroundTaskName;

/**
 * Background location task. When the app is backgrounded/locked, expo-location
 * delivers batched fixes here. We push them into the TripEngine so the trip
 * keeps recording exactly as if foregrounded.
 *
 * CRITICAL: We apply filterFix() here with the same prev-fix reference as the
 * foreground stream so that background GPS spikes cannot:
 *   - add fake distance
 *   - create path discontinuities
 *   - corrupt route progress
 *   - trigger false arrival
 *
 * This requires a development/production build — Expo Go does not run
 * background location tasks.
 */
if (Platform.OS !== 'web') {
  try {
    TaskManager.defineTask(BG_TRIP_TASK, async ({ data, error }) => {
      if (error) return;
      const locations = (data as { locations?: any[] })?.locations;
      if (!locations || locations.length === 0) return;

      for (const loc of locations) {
        const rawFix = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          altitude: loc.coords.altitude ?? undefined,
          accuracy: loc.coords.accuracy ?? undefined,
          heading: loc.coords.heading ?? undefined,
          speed: loc.coords.speed ?? undefined,
          timestamp: loc.timestamp,
        };

        // Apply the same GPS quality filter as the foreground stream.
        // getLastFix() returns the last accepted fix so the jump/speed check
        // uses a consistent previous reference across foreground and background.
        const prev = getLastFix();
        const accepted = filterFix(rawFix, prev);
        if (!accepted) {
          if (__DEV__) {
            console.log(
              `[GPS][BG] rejected lat=${rawFix.latitude.toFixed(6)} accuracy=${rawFix.accuracy ?? 'N/A'}`
            );
          }
          continue;
        }

        if (__DEV__) {
          console.log(
            `[GPS][BG] accepted lat=${accepted.latitude.toFixed(6)} accuracy=${accepted.accuracy ?? 'N/A'}`
          );
        }

        tripEngine.setCurrentPosition(accepted);
        await tripEngine.ingestFix(accepted);
      }
    });
  } catch {
    // Task registration failures (e.g. unsupported runtime) are non-fatal:
    // foreground tracking continues to work.
  }
}

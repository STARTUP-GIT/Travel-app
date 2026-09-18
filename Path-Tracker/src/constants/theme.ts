import { Platform } from 'react-native';

export const APP_NAME = 'Path Tracker';

/**
 * Semantic color roles for the recorded path, return route and alert states.
 * Kept consistent across every screen.
 */
export const RouteColors = {
  recorded: '#4A90FF',
  recordedCasing: '#FFFFFF',
  returnRoute: '#FFB020',
  returnRouteCasing: '#FFFFFF',
  deviation: '#FF3B30',
  deviationCasing: '#FFFFFF',
  start: '#22C55E',
  destination: '#FF6B35',
} as const;

export const Colors = {
  primary: '#208AEF',
  primaryLight: '#4BA3F5',
  primaryDark: '#1769C8',

  success: '#22C55E',
  successLight: '#4ADE80',
  warning: '#F5A623',
  warningLight: '#FFC86B',
  danger: '#FF3B30',
  dangerLight: '#FF6B61',

  background: '#0F1115',
  backgroundLight: '#15181E',
  surface: '#1A1E25',
  surfaceElevated: '#242933',
  surfaceGlass: 'rgba(26, 30, 37, 0.86)',

  text: '#FFFFFF',
  textSecondary: '#B9C0CC',
  textMuted: '#6C7280',

  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.16)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
  hero: 48,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Shadows = Platform.select({
  ios: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 20,
    },
  },
  android: {
    sm: { elevation: 3 },
    md: { elevation: 7 },
    lg: { elevation: 14 },
  },
  default: {
    sm: { elevation: 3 },
    md: { elevation: 7 },
    lg: { elevation: 14 },
  },
}) as any;

export const GlassCardStyle = {
  backgroundColor: Colors.surfaceGlass,
  borderWidth: 1,
  borderColor: Colors.borderLight,
  borderRadius: BorderRadius.lg,
  ...Shadows.md,
} as const;

export const MapConfig = {
  defaultZoom: 17,
  minZoom: 15,
  maxZoom: 20,
  returnZoom: 17,
  cameraUpdateThrottleMs: 1200,
  routeCasingWidth: 16,
  routeInnerWidth: 12,
  returnCasingWidth: 18,
  returnInnerWidth: 14,
} as const;

export const TrackingConfig = {
  // GPS sampling: fine-grained 1m / 1000ms updates
  distanceFilterMeters: 1,
  timeIntervalMs: 1000,

  // Filtering
  minAccuracyMeters: 60,
  maxPlausibleSpeedMs: 45,
  maxJumpMeters: 250,
  duplicateThresholdMeters: 0.5,

  // Adaptive sampling for the recorded polyline
  adaptive: {
    straightMinDistance: 3,
    turnMinDistance: 1.5,
    turnAngleThresholdDeg: 25,
  },
} as const;

/**
 * Movement detection configuration.
 *
 * Uses multi-signal fusion (GPS displacement, direction consistency,
 * reported speed, position spread) to produce a confidence score.
 * Distance accumulation is gated on the resulting movement state.
 */
export const MovementConfig = {
  /** Number of recent GPS positions to analyse for random-walk detection. */
  positionHistorySize: 10,

  /**
   * Maximum average spread of recent positions (as a fraction of GPS accuracy)
   * before the system considers the user potentially moving.
   * Lower = more aggressive noise suppression.
   */
  stationarySpreadFactor: 0.55,

  /**
   * Minimum direction-consistency score (0–1) to indicate coherent movement.
   * 1 = all displacements in the same direction, 0 = random.
   */
  movingDirectionThreshold: 0.55,

  /** Confidence above which we transition toward MOVING. */
  confidenceMovingThreshold: 0.50,

  /** Confidence below which we transition toward STATIONARY. */
  confidenceStationaryThreshold: 0.30,

  /** Consecutive high-confidence fixes needed to declare MOVING. */
  movingConfirmCount: 3,

  /** Consecutive low-confidence fixes needed to declare STATIONARY. */
  stationaryConfirmCount: 5,

  /** Calibration period after trip start (ms) — no distance accumulated. */
  calibrationPeriodMs: 5000,

  /** Minimum fixes collected during calibration before movement detection activates. */
  calibrationMinFixes: 5,

  /** Minimum displacement (m) between consecutive fixes to consider. */
  minDisplacementM: 1.5,

  /**
   * Displacement must exceed this fraction of reported accuracy to count
   * as evidence of movement.  E.g. 0.4 with accuracy=11m → need >4.4m
   * displacement before it's treated as potential movement.
   */
  minDisplacementAccuracyRatio: 0.45,
} as const;

export const OffRouteConfig = {
  /** Distance from the route segment that counts as "off route". */
  thresholdMeters: 45,
  /** Hysteresis: user must be within this distance to exit off-route state. */
  exitThresholdMeters: 25,
  /** Consecutive updates in warning before it's confirmed. */
  confirmCount: 4,
  /** Cooldown between alerts for the same event. */
  alertCooldownMs: 30000,
  /** GPS accuracy above which we distrust the off-route verdict. */
  minReliableAccuracyMeters: 80,
} as const;

/**
 * Arrival state-machine configuration.
 * These thresholds are SEPARATE from off-route thresholds.
 */
export const ArrivalConfig = {
  /**
   * Distance from tripStart to enter CANDIDATE_ARRIVAL state.
   * Deliberately small; we use route-progress + consecutive fixes
   * for confirmation rather than a large radius.
   */
  candidateRadiusM: 20,
  /**
   * Distance the user must move away from start to EXIT candidate state.
   * Larger than candidateRadius to provide hysteresis.
   */
  candidateExitRadiusM: 30,
  /**
   * Number of consecutive 1-second ticks satisfying candidate conditions
   * before arrival is CONFIRMED. 3 = 3 seconds of sustained proximity.
   */
  confirmTickCount: 3,
  /**
   * Route progress must be at least this fraction of total outbound distance
   * before arrival can be confirmed. Prevents false arrival on the outbound leg.
   */
  minRouteProgressFraction: 0.75,
  /**
   * GPS accuracy must be better than this to count as a valid candidate tick.
   * Prevents a single poor fix from completing the trip.
   */
  maxAccuracyForConfirmM: 50,
} as const;

export const RoutingConfig = {
  baseUrl: 'https://router.project-osrm.org',
  /** Minimum distance the user must move before recalculating. */
  recalcMinMoveMeters: 60,
  /** Minimum time between routing calls. */
  recalcMinIntervalMs: 20000,
  /** Max off-route distance before forcing a recalc. */
  recalcMaxDistanceMeters: 250,
} as const;

export const AlertConfig = {
  vibrationPattern: [0, 250, 120, 250] as const,
  maxNotificationsPerSession: 4,
} as const;

export const Branding = {
  appName: APP_NAME,
  androidNotificationTitle: 'Path Tracker',
  androidNotificationBody: 'Recording your trip in the background',
  androidNotificationChannel: 'path-tracker-location',
  backgroundTaskName: 'path-tracker-background-location',
  databaseName: 'path-tracker.db',
} as const;

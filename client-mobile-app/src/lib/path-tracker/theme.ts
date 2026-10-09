// Constants and theme configuration for Path Tracker (Parity with Website).

export const TrackingConfig = {
  minAccuracyMeters: 30,
  maxJumpMeters: 150,
  maxPlausibleSpeedMs: 25, // ~90 km/h (walking/driving threshold)
  adaptive: {
    turnAngleThresholdDeg: 25,
    turnMinDistance: 1.5,
    straightMinDistance: 3,
  },
} as const;

export const MovementConfig = {
  positionHistorySize: 8,
  confidenceMovingThreshold: 0.55,
  confidenceStationaryThreshold: 0.35,
  movingConfirmCount: 2,
  stationaryConfirmCount: 3,
  minDisplacementAccuracyRatio: 0.45,
  calibrationPeriodMs: 4000,
  calibrationMinFixes: 3,
} as const;

export const OffRouteConfig = {
  thresholdMeters: 45,
  exitThresholdMeters: 25,
  confirmCount: 3,
  minReliableAccuracyMeters: 25,
  alertCooldownMs: 15000,
} as const;

export const ArrivalConfig = {
  candidateRadiusM: 40,
  candidateExitRadiusM: 60,
  minRouteProgressFraction: 0.75,
  maxAccuracyForConfirmM: 25,
  confirmTickCount: 3,
} as const;

export const RoutingConfig = {
  recalcMinIntervalMs: 10000,
} as const;

export const MapConfig = {
  defaultZoom: 17,
  cameraUpdateThrottleMs: 400,
  routeInnerWidth: 5,
  returnInnerWidth: 5,
} as const;

export const RouteColors = {
  recorded: '#208AEF', // Solid blue
  returnRoute: '#F59E0B', // Amber
  deviation: '#EF4444', // Red
  start: '#10B981', // Emerald green
  destination: '#EF4444', // Red
} as const;

export const Colors = {
  primary: '#208AEF',
  background: '#0F1115',
  card: '#181B21',
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
  border: '#272A30',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
} as const;

export const Branding = {
  databaseName: 'path-tracker.db',
  backgroundTaskName: 'kt-path-tracker-background',
} as const;

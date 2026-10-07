/**
 * Design tokens.
 *
 * Colours, spacing, radii and type scale are declared once here so every screen
 * looks like part of the same product and a change lands everywhere at once.
 * The palette is the customer web app's own: a deep indigo-blue for primary
 * actions, a green reserved for confirming actions, and warm neutrals so photos
 * — which are all admin-supplied — stay the loudest thing on screen.
 */

export const colors = {
  /* Brand */
  primary: "#2D50BE",
  primaryDark: "#1E3A8F",
  primaryLight: "#E8EDFC",
  primaryMuted: "#5B77D4",

  /* Confirmations and live tracking */
  success: "#16A34A",
  successDark: "#15803D",
  successLight: "#E7F6EC",

  /* Attention */
  warning: "#D97706",
  warningLight: "#FEF3C7",
  danger: "#DC2626",
  dangerLight: "#FEE2E2",
  info: "#0284C7",
  infoLight: "#E0F2FE",

  /* Surfaces */
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F6F7FB",
  surfaceSunken: "#EEF1F7",
  overlay: "rgba(9, 16, 34, 0.55)",

  /* Text */
  text: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#6B7280",
  textInverse: "#FFFFFF",

  /* Lines */
  border: "#E3E7EF",
  borderStrong: "#CBD3E1",

  /* Rating */
  star: "#F59E0B",

  /* Explicitly absent imagery */
  placeholder: "#E9ECF3",
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "800" },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "800" },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: "700" },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: "600" },
  small: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  smallStrong: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: "600" },
} as const;

/**
 * Shadows are declared per platform because Android uses `elevation` and iOS
 * uses the shadow* properties; using one on the other is silently ignored.
 */
export const shadows = {
  card: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: "#0B1220",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

/** Colour for a backend booking status pill. */
export function statusColor(status: string | null | undefined): {
  fg: string;
  bg: string;
} {
  switch (status) {
    case "CONFIRMED":
    case "COMPLETED":
      return { fg: colors.successDark, bg: colors.successLight };
    case "PENDING":
      return { fg: colors.warning, bg: colors.warningLight };
    case "REJECTED":
    case "CANCELLED":
      return { fg: colors.danger, bg: colors.dangerLight };
    default:
      return { fg: colors.textSecondary, bg: colors.surfaceMuted };
  }
}

/** Human wording for a booking status, so no raw enum reaches the UI. */
export function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case "CONFIRMED":
      return "Confirmed";
    case "COMPLETED":
      return "Completed";
    case "PENDING":
      return "Pending";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Unknown";
  }
}

/**
 * User-facing name for a guide type.
 *
 * The backend's `common_guide` is what a customer calls a Tour Guide. The
 * internal term never appears in the interface.
 */
export const TOUR_GUIDE_LABEL = "Tour Guide";

/** Labels for the food-category enum the restaurant backend uses. */
export function foodCategoryLabel(category: string | null | undefined): string {
  switch (category) {
    case "PUREVEG":
      return "Pure vegetarian";
    case "NONVEG":
      return "Non-vegetarian";
    case "VEG_AND_NONVEG":
      return "Vegetarian & non-vegetarian";
    default:
      return "Food";
  }
}
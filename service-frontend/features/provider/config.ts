import type {
  ProviderKind,
  ProviderRequestKind,
  RequestStatus,
  ServiceKind,
} from "@/features/provider/types";

/**
 * Every backend router for the service providers is mounted under a district
 * path segment (`/:districtId/services/hotel`, `/services/:districtId/commonguide`,
 * …). None of the owner-facing routes — auth, profile, my-listing, booking —
 * reads that segment: they authenticate from the backend JWT only, and the two
 * public listing routes explicitly return every approved record so the caller
 * scopes the result itself. A single stable placeholder is therefore enough and
 * keeps the frontend independent from whichever district an owner operates in.
 */
const SCOPE = "provider";

const MOUNT: Record<ProviderKind, string> = {
  hotel: `/${SCOPE}/services/hotel`,
  restaurant: `/${SCOPE}/services/restaurant`,
  common_guide: `/services/${SCOPE}/commonguide`,
  specific_guide: `/services/${SCOPE}/specificguide`,
};

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

export type ProviderKindMeta = {
  kind: ProviderKind;
  /** Tab / card label. */
  label: string;
  /** Longer description used on the login and signup provider pickers. */
  blurb: string;
  serviceKind: ServiceKind;
  /** Hotel and restaurant owners manage venues; guides manage their listing. */
  managesVenues: boolean;
  /** Only the two guide routers expose google-signin / google-signup. */
  supportsGoogle: boolean;
  /** Venue owners pick a district when registering; guides pick place(s). */
  signupNeedsPlace: boolean;
};

export const PROVIDER_KIND_META: Record<ProviderKind, ProviderKindMeta> = {
  hotel: {
    kind: "hotel",
    label: "Hotel",
    blurb: "List your property, manage rates and handle stay requests.",
    serviceKind: "hotel",
    managesVenues: true,
    supportsGoogle: false,
    signupNeedsPlace: false,
  },
  restaurant: {
    kind: "restaurant",
    label: "Restaurant",
    blurb: "Publish your menu, set your table policy and handle reservations.",
    serviceKind: "restaurant",
    managesVenues: true,
    supportsGoogle: false,
    signupNeedsPlace: false,
  },
  common_guide: {
    kind: "common_guide",
    label: "Tour guide",
    blurb: "Guide travellers across several places in a district.",
    serviceKind: "guide",
    managesVenues: false,
    supportsGoogle: true,
    signupNeedsPlace: true,
  },
  specific_guide: {
    kind: "specific_guide",
    label: "Place guide",
    blurb: "Guide travellers for one specific place or attraction.",
    serviceKind: "guide",
    managesVenues: false,
    supportsGoogle: true,
    signupNeedsPlace: true,
  },
};

export function providerMeta(kind: ProviderKind): ProviderKindMeta {
  return PROVIDER_KIND_META[kind];
}

/* -------------------------------------------------------------------------- */
/*  Endpoint builders (all verified against backend/src/app.ts)                */
/* -------------------------------------------------------------------------- */

export function authPath(kind: ProviderKind, action: "signup" | "signin" | "signout") {
  return `${MOUNT[kind]}/api/auth/${action}`;
}

export function googleAuthPath(kind: ProviderKind, action: "signup" | "signin") {
  return `${MOUNT[kind]}/api/auth/google-${action}`;
}

export function profilePath(
  kind: ProviderKind,
  action: "getprofile" | "editprofile" | "deleteprofile"
) {
  return `${MOUNT[kind]}/profile/api/${action}`;
}

/**
 * Common Guide tour packages, on the guide's own profile router. Only the common
 * guide has packages — a place guide is tied to a single place by definition —
 * so the builder is deliberately not keyed by `ProviderKind` and callers are
 * expected to render it for `common_guide` only.
 */
export function packagesPath(packageId?: string): string {
  return packageId
    ? `${MOUNT.common_guide}/profile/api/packages/${packageId}`
    : `${MOUNT.common_guide}/profile/api/packages`;
}

/** Owner-scoped listing routes. Both need the backend JWT. */
export function ownerListingsPath(kind: "hotel" | "restaurant"): string {
  return kind === "hotel"
    ? `${MOUNT.hotel}/api/my-hotels`
    : `${MOUNT.restaurant}/api/my-restaurants`;
}

/** Public listing routes: approved records only, no JWT. */
export function publicHotelListingsPath(): string {
  return `${MOUNT.hotel}/api/getallhotels`;
}

export function publicRestaurantListingsPath(): string {
  return `${MOUNT.restaurant}/api/restaurants`;
}

export function createListingPath(kind: ProviderKind): string | null {
  if (kind === "hotel") return `${MOUNT.hotel}/api/createhotels`;
  if (kind === "restaurant") return `${MOUNT.restaurant}/api/restaurants`;
  return null;
}

export function listingPath(kind: ProviderKind, id: string): string | null {
  if (kind === "hotel") return `${MOUNT.hotel}/api/update/${id}`;
  if (kind === "restaurant") return `${MOUNT.restaurant}/api/restaurants/${id}`;
  return null;
}

export function deleteListingPath(kind: ProviderKind, id: string): string | null {
  if (kind === "hotel") return `${MOUNT.hotel}/api/delete/${id}`;
  if (kind === "restaurant") return `${MOUNT.restaurant}/api/restaurants/${id}`;
  return null;
}

export function requestsPath(kind: ProviderKind): string {
  if (kind === "hotel") return `${MOUNT.hotel}/booking/api/owner`;
  if (kind === "restaurant") return `${MOUNT.restaurant}/reservation/api/owner`;
  return `${MOUNT[kind]}/profile/api/bookings`;
}

export function requestPath(kind: ProviderKind, id: string): string {
  if (kind === "hotel") return `${MOUNT.hotel}/booking/api/${id}/status`;
  if (kind === "restaurant") return `${MOUNT.restaurant}/reservation/api/${id}/status`;
  return `${MOUNT[kind]}/profile/api/bookings/${id}/status`;
}

/** The public, approved listing routes used to resolve place names. */
export function placesInDistrictPath(districtId: string): string {
  return `/${SCOPE}/services/api/places/district/${districtId}`;
}

/**
 * The guide-scoped district place list: approved places, plus the signed-in
 * guide's own places that are still awaiting review.
 *
 * Needs the provider session, so it is called from a server action rather than
 * through the unauthenticated client. Separate from the public route above on
 * purpose — that one must keep serving approved places only.
 */
export function manageablePlacesInDistrictPath(districtId: string): string {
  return `/${SCOPE}/services/api/places/manageable/${districtId}`;
}

/** Create a place as the signed-in guide, honouring the existing approval flow. */
export function submitPlacePath(): string {
  return `/${SCOPE}/services/api/places/submit`;
}

/* -------------------------------------------------------------------------- */
/*  Request status transitions                                                */
/* -------------------------------------------------------------------------- */

export type StatusAction = {
  status: RequestStatus;
  label: string;
  variant: "accept" | "decline" | "neutral";
};

type TransitionRule = {
  from: RequestStatus[];
  actions: StatusAction[];
};

/**
 * Derived directly from the two backend validation schemas:
 *  - hotels / restaurants -> bookingStatusSchema (PENDING, CONFIRMED, CANCELLED, COMPLETED)
 *  - guides              -> guideBookingStatusSchema (CONFIRMED, REJECTED, CANCELLED, COMPLETED)
 *
 * Guides therefore accept with CONFIRMED and decline with REJECTED, while venue
 * owners decline with CANCELLED — anything else would be rejected by the API.
 */
const VENUE_RULES: TransitionRule[] = [
  {
    from: ["PENDING"],
    actions: [
      { status: "CONFIRMED", label: "Accept", variant: "accept" },
      { status: "CANCELLED", label: "Decline", variant: "decline" },
    ],
  },
  {
    from: ["CONFIRMED"],
    actions: [
      { status: "COMPLETED", label: "Mark completed", variant: "neutral" },
      { status: "CANCELLED", label: "Cancel", variant: "decline" },
    ],
  },
];

const GUIDE_RULES: TransitionRule[] = [
  {
    from: ["PENDING"],
    actions: [
      { status: "CONFIRMED", label: "Accept", variant: "accept" },
      { status: "REJECTED", label: "Reject", variant: "decline" },
    ],
  },
  {
    from: ["CONFIRMED"],
    actions: [
      { status: "COMPLETED", label: "Mark completed", variant: "neutral" },
      { status: "CANCELLED", label: "Cancel", variant: "decline" },
    ],
  },
];

/**
 * `statusActions` is keyed on the signed-in provider role, but each request row
 * carries the request's own kind, so requests are mapped back to the role that
 * is allowed to transition them.
 */
export function providerKindForRequest(
  kind: ProviderRequestKind
): ProviderKind {
  switch (kind) {
    case "hotel_booking":
      return "hotel";
    case "restaurant_reservation":
      return "restaurant";
    case "specific_guide_booking":
      return "specific_guide";
    case "common_guide_booking":
      return "common_guide";
  }
}

export function statusActions(
  kind: ProviderKind,
  status: RequestStatus
): StatusAction[] {
  const rules = kind === "hotel" || kind === "restaurant" ? VENUE_RULES : GUIDE_RULES;
  return rules.find((rule) => rule.from.includes(status))?.actions ?? [];
}

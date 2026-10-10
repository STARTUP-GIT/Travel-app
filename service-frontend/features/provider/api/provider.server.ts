import "server-only";

import { ApiError, api } from "@/lib/api/client";
import { backendRequest, errorMessage, fieldErrors, readJson } from "@/lib/api/server";
import { memoizedGet } from "@/lib/api/cache";
import {
  authPath,
  createListingPath,
  deleteListingPath,
  googleAuthPath,
  listingPath,
  manageablePlacesInDistrictPath,
  profilePath,
  providerMeta,
  ownerListingsPath,
  packagesPath,
  publicHotelListingsPath,
  publicRestaurantListingsPath,
  requestPath,
  requestsPath,
  resolvePlaceLocationPath,
  submitPlacePath,
} from "@/features/provider/config";
import type {
  FoodCategory,
  HotelRecord,
  ManagedRecord,
  ManageablePlace,
  PlaceSubmissionInput,
  ProviderKind,
  ProviderListing,
  ProviderListingInput,
  ProviderListingsResult,
  ProviderProfile,
  ProviderProfileInput,
  ProviderRequest,
  ProviderRequestKind,
  ProviderStats,
  RequestStatus,
  RestaurantRecord,
  MealsServiceOption,
  PlaceEntryFeeStatus,
  PlaceVisitArrangement,
  SpecificGuideSummary,
  TourPackage,
  TourPackageInput,
  TourPackagesResult,
  TransportServiceOption,
  TransportVehicleConfig,
} from "@/features/provider/types";
import { getDistricts } from "@/features/locations/api/locations.api";
import { getPlaces } from "@/features/places/api/places.api";

/** Backend error carrying the per-field validation messages when present. */
export class ProviderApiError extends ApiError {
  fields: Record<string, string>;

  constructor(message: string, status: number, fields: Record<string, string>) {
    super(message, status, fields);
    this.name = "ProviderApiError";
    this.fields = fields;
  }
}

/** Authenticated GET/POST/PATCH/DELETE against a backend router, with a token. */
async function authorized<T>(
  path: string,
  token: string,
  init: { method?: string; body?: unknown; fallback: string }
): Promise<T> {
  const res = await backendRequest(path, {
    method: init.method ?? "GET",
    body: init.body,
    token,
  });
  return readJsonOrThrow<T>(res, init.fallback);
}

async function readJsonOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = await readJson<unknown>(res);
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[provider.server] HTTP ${res.status}:`,
        typeof body === "string" ? body.slice(0, 300) : body
      );
    }
    // A 4xx body is written by a controller for the person who made the request,
    // so its wording is theirs to read. A 5xx body or raw HTML error page from a
    // proxy falls back to the safe, friendly fallback message.
    const message =
      res.status >= 500
        ? fallback
        : errorMessage(body, fallback);
    throw new ProviderApiError(message, res.status, fieldErrors(body));
  }

  const body = await readJson<T>(res);
  if (body === null) throw new ProviderApiError(fallback, res.status, {});
  return body;
}

/* -------------------------------------------------------------------------- */
/*  Places index — public data, resolves place ids to names                    */
/* -------------------------------------------------------------------------- */

export type PlaceRef = { id: string; name: string; district: string };

/** Every approved place, keyed by id. Used to name guide listings. */
export async function getPlacesIndex(): Promise<Map<string, PlaceRef>> {
  return memoizedGet("provider:places-index", async () => {
    const districts = await getDistricts();

    const lists = await Promise.all(
      districts.map((district) =>
        getPlaces(district.id)
          .then((places) =>
            places.map((place) => ({
              id: place.id,
              name: place.name,
              district: district.name,
            }))
          )
          // One unavailable district must not hide the other districts' places.
          .catch(() => [] as PlaceRef[])
      )
    );

    const map = new Map<string, PlaceRef>();
    for (const entry of lists.flat()) map.set(entry.id, entry);
    return map;
  });
}

/* -------------------------------------------------------------------------- */
/*  Authentication                                                            */
/* -------------------------------------------------------------------------- */

export type ProviderSignupInput = {
  email: string;
  username: string;
  password: string;
  fullname: string;
  phonenumber: string;
  /**
   * Deliberately absent: no photo URL. A profile photo is a file chosen on the
   * sign-up form and uploaded to Cloudinary once the account exists, so there
   * is no way to send a hand-typed or otherwise unverified URL here.
   */
  /** Guides only. */
  placeIds: string[];
  experience: number;
  cost: number;
  languages: string[];
};

export type GoogleProviderSignupInput = {
  email: string;
  fullname: string;
  profilepic?: string;
  phonenumber?: string;
  placeIds: string[];
  experience: number;
  cost: number;
  languages: string[];
};

/**
 * The four signup routers are separate and their schemas disagree on one field:
 * the two owner routers take `phone_number`, both guide routers take
 * `phonenumber`, and only the guide schemas take the guide-only fields.
 */
export function signupPayload(
  kind: ProviderKind,
  input: ProviderSignupInput
): Record<string, unknown> {
  const meta = providerMeta(kind);

  if (meta.managesVenues) {
    return {
      name: input.fullname,
      username: input.username,
      email: input.email,
      password: input.password,
      phone_number: input.phonenumber,
    };
  }

  return {
    fullname: input.fullname,
    username: input.username,
    email: input.email,
    password: input.password,
    phonenumber: input.phonenumber,
    provider: "email",
    experience: input.experience,
    cost: input.cost,
    language: input.languages,
    // A guide may register with no place at all. An absent place is sent as the
    // API's own "no relationship" value — null for the single-place guide, an
    // empty list for the multi-place one — never as an empty string id.
    placeid: kind === "common_guide" ? input.placeIds : (input.placeIds[0] ?? null),
  };
}

export function googleSignupPayload(
  kind: ProviderKind,
  input: GoogleProviderSignupInput
): Record<string, unknown> {
  return {
    email: input.email,
    fullname: input.fullname,
    profilepic: input.profilepic,
    phonenumber: input.phonenumber,
    placeid: kind === "common_guide" ? input.placeIds : (input.placeIds[0] ?? null),
    experience: input.experience,
    cost: input.cost,
    language: input.languages,
  };
}

/** POST /api/auth/signup on the provider's own auth router. */
export async function signupWithEmail(
  kind: ProviderKind,
  input: ProviderSignupInput
): Promise<{ message: string }> {
  const res = await backendRequest(authPath(kind, "signup"), {
    method: "POST",
    body: signupPayload(kind, input),
  });
  return readJsonOrThrow<{ message: string }>(res, "Could not create the account");
}

/**
 * The backend answered a 2xx sign-in but the body carried no session token.
 */
export class MissingSessionTokenError extends ProviderApiError {
  constructor(kind: ProviderKind) {
    super(
      `The ${kind} sign-in response carried no session token.`,
      200,
      {}
    );
    this.name = "MissingSessionTokenError";
  }
}

/** The Express routers put the JWT on `token` (see hotel/restaurant/guide signIn). */
function extractBackendToken(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const body = data as Record<string, unknown>;
  for (const key of ["token", "sessionToken", "accessToken"] as const) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** POST /api/auth/signin on the provider's own auth router. */
export async function signinWithEmail(
  kind: ProviderKind,
  email: string,
  password: string
): Promise<string> {
  const res = await backendRequest(authPath(kind, "signin"), {
    method: "POST",
    body: { email, password },
  });

  const data = await readJsonOrThrow<unknown>(res, "Could not sign in");
  const token = extractBackendToken(data);

  if (!token) {
    throw new MissingSessionTokenError(kind);
  }
  return token;
}

/**
 * Guides only. The backend is the authority: it answers 404 when no guide
 * account exists for the verified Google email, which the signup screen uses to
 * continue into the Google registration form.
 */
export async function googleSigninWithEmail(
  kind: ProviderKind,
  email: string
): Promise<string | null> {
  const res = await backendRequest(googleAuthPath(kind, "signin"), {
    method: "POST",
    body: { email },
  });

  if (!res.ok) return null;
  const data = await readJson<unknown>(res);
  return extractBackendToken(data);
}

/** Guides only. 201 when created, 409 when the account already exists. */
export async function googleSignup(
  kind: ProviderKind,
  input: GoogleProviderSignupInput
): Promise<number> {
  const res = await backendRequest(googleAuthPath(kind, "signup"), {
    method: "POST",
    body: googleSignupPayload(kind, input),
  });
  return res.status;
}

export async function signoutProvider(kind: ProviderKind): Promise<void> {
  await backendRequest(authPath(kind, "signout"), { method: "POST" }).catch(
    () => undefined
  );
}

/* -------------------------------------------------------------------------- */
/*  Profile                                                                   */
/* -------------------------------------------------------------------------- */

type RawOwnerProfile = {
  id: string;
  name: string;
  username: string;
  email: string;
  phone_number: string | null;
  profile_pic: string | null;
  createdAt: string;
  updatedAt: string;
};

type RawGuideProfile = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phonenumber: string | null;
  profile_pic: string | null;
  tagline: string | null;
  agencyName?: string | null;
  agencyAddress?: string | null;
  agencyBanner?: string | null;
  agencyMapsUrl?: string | null;
  authprovider: string;
  review: string[];
  rating: number | null;
  description: string | null;
  placeid?: string | null;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  place?: {
    id: string;
    name: string;
    category: string;
    images: string[];
    entryfee: number | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    district: { id: string; name: string; slug?: string } | null;
  } | null;
  isReported: boolean;
  experience: number;
  cost: number;
  language: string[];
  createdAt: string;
  updatedAt: string;
};

type RawProfile = RawOwnerProfile | RawGuideProfile;

export function normalizeProfile(
  kind: ProviderKind,
  raw: RawProfile
): ProviderProfile {
  if (providerMeta(kind).managesVenues) {
    const owner = raw as RawOwnerProfile;
    return {
      id: owner.id,
      kind,
      name: owner.name,
      username: owner.username,
      email: owner.email,
      phone: owner.phone_number ?? "",
      photo: owner.profile_pic ?? null,
      tagline: "",
      agencyName: "",
      agencyAddress: "",
      agencyBanner: null,
      agencyMapsUrl: null,
      description: "",
      experience: 0,
      cost: 0,
      languages: [],
      rating: null,
      reviews: [],
      placeIds: [],
      linkedPlace: null,
      isReported: false,
      authProvider: "EMAIL",
      createdAt: owner.createdAt,
      updatedAt: owner.updatedAt,
    };
  }

  const guide = raw as RawGuideProfile;
  return {
    id: guide.id,
    kind,
    status: guide.status,
    name: guide.full_name,
    username: guide.username,
    email: guide.email,
    phone: guide.phonenumber ?? "",
    photo: guide.profile_pic || null,
    tagline: guide.tagline ?? "",
    agencyName: guide.agencyName ?? "",
    agencyAddress: guide.agencyAddress ?? "",
    agencyBanner: guide.agencyBanner || null,
    agencyMapsUrl: guide.agencyMapsUrl || null,
    description: guide.description ?? "",
    experience: guide.experience ?? 0,
    cost: guide.cost ?? 0,
    languages: guide.language ?? [],
    rating: guide.rating ?? null,
    reviews: guide.review ?? [],
    placeIds: guide.placeid ? [guide.placeid] : [],
    linkedPlace: guide.place ?? null,
    isReported: guide.isReported === true,
    authProvider: guide.authprovider ?? "EMAIL",
    createdAt: guide.createdAt,
    updatedAt: guide.updatedAt,
  };
}

/** Each profile router wraps the record in its own key. */
function pickProfile(data: Record<string, unknown>): RawProfile | null {
  return (
    (data.hotel_owner as RawOwnerProfile) ??
    (data.restaurent_owner as RawOwnerProfile) ??
    (data.common_guide as RawGuideProfile) ??
    (data.specific_guide as RawGuideProfile) ??
    (data.user as RawGuideProfile) ??
    null
  );
}

export async function getProviderProfile(
  token: string,
  kind: ProviderKind
): Promise<ProviderProfile> {
  const res = await backendRequest(profilePath(kind, "getprofile"), { token });
  const data = await readJsonOrThrow<Record<string, unknown>>(
    res,
    "Could not load your profile"
  );

  const raw = pickProfile(data);
  if (!raw) {
    throw new ProviderApiError("Could not load your profile", res.status, {});
  }
  return normalizeProfile(kind, raw);
}

export function profilePayload(
  kind: ProviderKind,
  input: ProviderProfileInput
): Record<string, unknown> {
  const meta = providerMeta(kind);
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    payload[meta.managesVenues ? "name" : "full_name"] = input.name;
  }
  if (input.username !== undefined) payload.username = input.username;
  if (input.email !== undefined) payload.email = input.email;
  if (input.phone !== undefined) {
    payload[meta.managesVenues ? "phone_number" : "phonenumber"] = input.phone;
  }
  if (input.photo !== undefined) payload.profile_pic = input.photo;
  if (input.password) payload.password = input.password;

  if (!meta.managesVenues) {
    if (input.tagline !== undefined) payload.tagline = input.tagline;
    if (input.description !== undefined) payload.description = input.description;
    if (input.experience !== undefined) payload.experience = input.experience;
    if (input.cost !== undefined) payload.cost = input.cost;
    if (input.languages !== undefined) payload.language = input.languages;
  }

  if (kind === "common_guide") {
    if (input.agencyName !== undefined) payload.agency_name = input.agencyName;
    if (input.agencyAddress !== undefined) payload.agency_address = input.agencyAddress;
    if (input.agencyMapsUrl !== undefined) payload.agency_maps_url = input.agencyMapsUrl;
    if (input.agencyBanner !== undefined) payload.agency_banner = input.agencyBanner;
  }

  return payload;
}

export async function updateProviderProfile(
  token: string,
  kind: ProviderKind,
  input: ProviderProfileInput
): Promise<ProviderProfile> {
  const payload = profilePayload(kind, input);

  if (Object.keys(payload).length === 0) {
    return getProviderProfile(token, kind);
  }

  const res = await backendRequest(profilePath(kind, "editprofile"), {
    method: "PATCH",
    body: payload,
    token,
  });

  const data = await readJsonOrThrow<Record<string, unknown>>(
    res,
    "Unable to save your profile right now. Please try again."
  );

  const raw = pickProfile(data);
  if (!raw) return getProviderProfile(token, kind);
  return normalizeProfile(kind, raw);
}

export async function deleteProviderProfile(
  token: string,
  kind: ProviderKind
): Promise<void> {
  const res = await backendRequest(profilePath(kind, "deleteprofile"), {
    method: "DELETE",
    token,
  });

  if (!res.ok) {
    const body = await readJson<unknown>(res);
    if (kind === "common_guide" && res.status === 500) {
      // The cause is logged rather than described: the guide only needs to know
      // the account still has places attached and that support can remove it. A
      // 5xx body is never passed on to the screen.
      console.error("Delete common guide profile failed:", body);
      throw new ProviderApiError(
        "This account is still linked to places, so it cannot be deleted here. Please contact support to have it removed.",
        500,
        {}
      );
    }
    throw new ProviderApiError(
      res.status >= 500
        ? "Unable to delete your account right now. Please try again."
        : errorMessage(body, `Could not delete your account (HTTP ${res.status})`),
      res.status,
      fieldErrors(body)
    );
  }
  await readJson<unknown>(res);
}

/* -------------------------------------------------------------------------- */
/*  Tour packages (common guide only)                                          */
/* -------------------------------------------------------------------------- */

type RawPackagePlace = {
  id: string;
  name: string;
  description?: string | null;
  images?: string[] | null;
  category?: string | null;
  entryfee?: number | null;
  pricing?: {
    id: string;
    visitor: "DOMESTIC" | "FOREIGN";
    ageGroup: string;
    amount: number;
  }[] | null;
  district?: { id: string; name: string } | null;
};

type RawTourPackage = {
  id: string;
  name: string;
  description: string | null;
  duration?: string | null;
  maxGroupSize?: number | null;
  packageImages?: string[] | null;
  pricingMode?: "WHOLE_TOUR" | "PLACE_BASED";
  pricingUnit?: "PER_TOUR" | "PER_PERSON";
  price?: number;
  allowCustomerPlaceSelection?: boolean;
  cancellationPolicy?: string | null;
  foodStatus?: string;
  foodDetails?: string | null;
  mealsService?: MealsServiceOption;
  includedMeals?: string[] | null;
  mealDetails?: string | null;
  transportStatus?: string;
  transportDetails?: string | null;
  transportService?: TransportServiceOption;
  transportVehicles?: TransportVehicleConfig[] | null;
  entryFeeStatus?: string;
  entryFeeDetails?: string | null;
  additionalCostsDetails?: string | null;
  hasSpecificGuide?: boolean;
  specificGuideId?: string | null;
  specificGuide?: SpecificGuideSummary | null;
  childrenAllowed?: boolean;
  childMaxAge?: number | null;
  maxChildren?: number | null;
  childrenCountTowardCapacity?: boolean;
  childPrice?: number | null;
  childConditions?: string | null;
  tripStartTime?: string | null;
  pickupName?: string | null;
  pickupAddress?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupMapsUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  places: (RawPackagePlace & {
    price?: number | null;
    itineraryOrder?: number;
    visitArrangement?: PlaceVisitArrangement;
    expectedDuration?: string | null;
    entryFeeStatus?: PlaceEntryFeeStatus;
    entryFeeAmount?: number | null;
  })[];
};

/** The guide-scoped district place list, as the backend selects it. */
type RawManageablePlace = {
  id: string;
  name: string;
  images: string[] | null;
  category: string | null;
  entryfee: number | null;
  status: ManageablePlace["status"];
  district: { id: string; name: string } | null;
};

export type { TourPackagesResult };

function normalizePackage(raw: RawTourPackage): TourPackage {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    duration: raw.duration ?? null,
    maxGroupSize: raw.maxGroupSize ?? null,
    packageImages: raw.packageImages ?? [],
    pricingMode: raw.pricingMode ?? "WHOLE_TOUR",
    pricingUnit: raw.pricingUnit ?? "PER_TOUR",
    price: raw.price ?? 0,
    allowCustomerPlaceSelection: raw.allowCustomerPlaceSelection ?? true,
    cancellationPolicy: raw.cancellationPolicy ?? null,
    foodStatus: raw.foodStatus ?? "EXCLUDED",
    foodDetails: raw.foodDetails ?? null,
    mealsService: raw.mealsService ?? "NO_SERVICE",
    includedMeals: raw.includedMeals ?? [],
    mealDetails: raw.mealDetails ?? null,
    transportStatus: raw.transportStatus ?? "EXCLUDED",
    transportDetails: raw.transportDetails ?? null,
    transportService: raw.transportService ?? "NO_SERVICE",
    transportVehicles: raw.transportVehicles ?? null,
    entryFeeStatus: raw.entryFeeStatus ?? "EXCLUDED",
    entryFeeDetails: raw.entryFeeDetails ?? null,
    additionalCostsDetails: raw.additionalCostsDetails ?? null,
    hasSpecificGuide: Boolean(raw.hasSpecificGuide),
    specificGuideId: raw.specificGuideId ?? null,
    specificGuide: raw.specificGuide ?? null,
    childrenAllowed: raw.childrenAllowed ?? true,
    childMaxAge: raw.childMaxAge ?? null,
    maxChildren: raw.maxChildren ?? null,
    childrenCountTowardCapacity: raw.childrenCountTowardCapacity ?? true,
    childPrice: raw.childPrice ?? null,
    childConditions: raw.childConditions ?? null,
    tripStartTime: raw.tripStartTime ?? null,
    pickupName: raw.pickupName ?? null,
    pickupAddress: raw.pickupAddress ?? null,
    pickupLat: raw.pickupLat ?? null,
    pickupLng: raw.pickupLng ?? null,
    pickupMapsUrl: raw.pickupMapsUrl ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    places: (raw.places ?? []).map((place) => ({
      id: place.id,
      name: place.name,
      description: place.description ?? null,
      images: place.images ?? [],
      category: place.category ?? "",
      entryfee: place.entryfee ?? null,
      price: place.price ?? null,
      itineraryOrder: place.itineraryOrder ?? 0,
      visitArrangement: place.visitArrangement ?? "GUIDED",
      expectedDuration: place.expectedDuration ?? null,
      entryFeeStatus: place.entryFeeStatus ?? "EXCLUDED",
      entryFeeAmount: place.entryFeeAmount ?? null,
      pricing: place.pricing ?? [],
      district: place.district ?? null,
    })),
  };
}

export function packagePayload(
  input: TourPackageInput
): Record<string, unknown> {
  return {
    name: input.name,
    description: input.description.trim() ? input.description.trim() : null,
    duration: input.duration?.trim() || null,
    maxGroupSize: input.maxGroupSize !== undefined && input.maxGroupSize !== null ? Number(input.maxGroupSize) : null,
    packageImages: input.packageImages ?? [],
    pricingMode: input.pricingMode ?? "WHOLE_TOUR",
    pricingUnit: input.pricingUnit ?? "PER_TOUR",
    price: input.price ?? 0,
    allowCustomerPlaceSelection: input.allowCustomerPlaceSelection ?? true,
    cancellationPolicy: input.cancellationPolicy?.trim() || null,
    foodStatus: input.foodStatus || "EXCLUDED",
    foodDetails: input.foodDetails?.trim() || null,
    mealsService: input.mealsService ?? "NO_SERVICE",
    includedMeals: input.includedMeals ?? [],
    mealDetails: input.mealDetails?.trim() || null,
    transportStatus: input.transportStatus || "EXCLUDED",
    transportDetails: input.transportDetails?.trim() || null,
    transportService: input.transportService ?? "NO_SERVICE",
    transportVehicles: input.transportVehicles ?? null,
    entryFeeStatus: input.entryFeeStatus || "EXCLUDED",
    entryFeeDetails: input.entryFeeDetails?.trim() || null,
    additionalCostsDetails: input.additionalCostsDetails?.trim() || null,
    hasSpecificGuide: Boolean(input.hasSpecificGuide),
    specificGuideId: input.specificGuideId || null,
    childrenAllowed: input.childrenAllowed ?? true,
    childMaxAge: input.childMaxAge !== undefined && input.childMaxAge !== null ? Number(input.childMaxAge) : null,
    maxChildren: input.maxChildren !== undefined && input.maxChildren !== null ? Number(input.maxChildren) : null,
    childrenCountTowardCapacity: input.childrenCountTowardCapacity ?? true,
    childPrice: input.childPrice !== undefined && input.childPrice !== null ? Number(input.childPrice) : null,
    childConditions: input.childConditions?.trim() || null,
    tripStartTime: input.tripStartTime?.trim() || null,
    pickupName: input.pickupName?.trim() || null,
    pickupAddress: input.pickupAddress?.trim() || null,
    pickupLat: input.pickupLat ?? null,
    pickupLng: input.pickupLng ?? null,
    pickupMapsUrl: input.pickupMapsUrl?.trim() || null,
    placeIds: input.placeIds,
    placePrices: input.placePrices ?? {},
    placeItinerary: input.placeItinerary ?? [],
  };
}

/**
 * The places a guide may pick for a package in one district.
 *
 * A failure is reported as a failure rather than as an empty district, so the
 * picker can tell "this district has no places" apart from "the list could not
 * be loaded" — only the first is a reason to offer the create-place action.
 */
export async function getManageablePlaces(
  token: string,
  districtId: string
): Promise<{ places: ManageablePlace[]; error: string | null }> {
  try {
    const rows = await authorized<RawManageablePlace[]>(
      manageablePlacesInDistrictPath(districtId),
      token,
      { fallback: "The places in this district could not be loaded." }
    );
    return {
      places: (rows ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        images: row.images ?? [],
        category: row.category ?? "",
        entryfee: row.entryfee ?? null,
        status: row.status,
        district: row.district ?? null,
      })),
      error: null,
    };
  } catch (error) {
    return {
      places: [],
      error:
        error instanceof ProviderApiError
          ? error.message
          : "The places in this district could not be loaded.",
    };
  }
}

/**
 * Turns a Google Maps link into the coordinates a place is stored with.
 *
 * The same backend resolver the admin place form uses — the guide pastes a link
 * instead of typing a latitude and a longitude, and the place row is written with
 * exactly the same two numbers as before. Resolving is not a create: a link that
 * cannot be resolved is a normal "not yet" state for the form, not an error to
 * raise, so a failure is reported as `null` and the message is left to the form.
 */
export async function resolvePlaceCoordinates(
  token: string,
  url: string
): Promise<{ latitude: number; longitude: number } | null> {
  const res = await backendRequest(resolvePlaceLocationPath(), {
    method: "POST",
    body: { url },
    token,
  });

  if (!res.ok) {
    // A link the resolver could not read is an expected outcome here, not a
    // failure to surface: the form reports it against the field.
    return null;
  }

  const data = await readJson<{ latitude?: unknown; longitude?: unknown }>(res);
  const { latitude, longitude } = data ?? {};

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return { latitude, longitude };
}

/**
 * Creates a place as the signed-in guide.
 *
 * Returns the created place even when it is still awaiting review, because the
 * whole point of creating it from here is to put it in a package straight away —
 * so the caller gets an id it can select regardless of approval state. The
 * backend decides approval; this only reports what it decided.
 */
export async function submitPlaceAsGuide(
  token: string,
  input: PlaceSubmissionInput
): Promise<ManageablePlace> {
  const data = await authorized<{ place?: RawManageablePlace }>(
    submitPlacePath(),
    token,
    {
      method: "POST",
      body: {
        name: input.name.trim(),
        description: input.description.trim(),
        districtId: input.districtId,
        images: input.images,
        entryfee: input.entryfee,
        category: input.category.trim(),
        latitude: input.latitude,
        longitude: input.longitude,
        // Only sent when bands exist, so a place with one flat price is not
        // rewritten to have no pricing data at all.
        ...(input.pricing && input.pricing.length > 0
          ? { pricing: input.pricing }
          : {}),
      },
      fallback: "The place could not be created.",
    }
  );

  if (!data?.place) {
    // No field map: the backend reports this per-message, not per field.
    throw new ProviderApiError("The place could not be created.", 502, {});
  }

  return {
    id: data.place.id,
    name: data.place.name,
    images: data.place.images ?? [],
    category: data.place.category ?? "",
    entryfee: data.place.entryfee ?? null,
    status: data.place.status,
    district: data.place.district ?? null,
  };
}

export async function getTourPackages(token: string): Promise<TourPackagesResult> {  try {
    const rows = await authorized<RawTourPackage[]>(packagesPath(), token, {
      fallback: "Your tour packages could not be loaded.",
    });
    return { packages: rows.map(normalizePackage), error: null };
  } catch (error) {
    /*
     * A failure here is reported as a failure and never as an empty list. The
     * backend answers 503 while the package tables are missing, and its own
     * message names the cause, so that one is kept verbatim; anything else falls
     * back to a generic message. Returning (rather than throwing) is what keeps a
     * package outage from taking the whole profile page down.
     */
    return {
      packages: [],
      error:
        error instanceof ProviderApiError
          ? error.message
          : "Your tour packages could not be loaded. Please try again.",
    };
  }
}

export async function createTourPackage(
  token: string,
  input: TourPackageInput
): Promise<TourPackage> {
  const row = await authorized<RawTourPackage>(packagesPath(), token, {
    method: "POST",
    body: packagePayload(input),
    fallback: "Could not create the tour package",
  });
  return normalizePackage(row);
}

export async function updateTourPackage(
  token: string,
  packageId: string,
  input: TourPackageInput
): Promise<TourPackage> {
  const row = await authorized<RawTourPackage>(packagesPath(packageId), token, {
    method: "PATCH",
    body: packagePayload(input),
    fallback: "Could not save the tour package",
  });
  return normalizePackage(row);
}

export async function deleteTourPackage(
  token: string,
  packageId: string
): Promise<void> {
  await authorized<unknown>(packagesPath(packageId), token, {
    method: "DELETE",
    fallback: "Could not delete the tour package",
  });
}

/* -------------------------------------------------------------------------- */
/*  Listings                                                                  */
/* -------------------------------------------------------------------------- */

function toListing(
  kind: ProviderKind,
  record: ManagedRecord
): ProviderListing {
  const isHotel = kind === "hotel";

  return {
    id: record.id,
    kind: isHotel ? "hotel" : "restaurant",
    name: record.name,
    subtitle: record.district?.name
      ? `${record.district.name} district`
      : "District unavailable",
    placeNames: [],
    image: record.profile_logo || record.images?.[0] || null,
    status: record.status,
    active: record.booking_enabled !== false,
    rating: typeof record.rating === "number" ? record.rating : null,
    reviews: record.review ?? [],
    price: isHotel ? (record as HotelRecord).cost_per_night : null,
    priceUnit: isHotel ? "per night" : "",
    description: record.description ?? null,
    phone: record.phone_number ?? null,
    whatsapp: record.whatsapp_number ?? null,
    email: record.email ?? null,
    website: record.website ?? null,
    address: record.address,
    latitude: record.latitude,
    longitude: record.longitude,
    createdAt: record.createdAt,
    editable: true,
    record,
  };
}

function guideListing(
  kind: ProviderKind,
  profile: ProviderProfile,
  places: Map<string, PlaceRef>
): ProviderListing {
  const placeNames = profile.placeIds
    .map((id) => places.get(id)?.name)
    .filter((name): name is string => Boolean(name));
  const district = profile.placeIds
    .map((id) => places.get(id)?.district)
    .find(Boolean);
  const coverage = kind === "common_guide" ? "Multi-place guide" : "Place guide";

  return {
    id: profile.id,
    kind: "guide",
    name: profile.name,
    subtitle: district
      ? `${coverage} · ${district} district`
      : coverage,
    placeNames,
    image: profile.photo,
    status: null,
    active: !profile.isReported,
    rating: profile.rating,
    reviews: profile.reviews,
    price: profile.cost,
    priceUnit: "per trip",
    description: profile.description || profile.tagline || null,
    phone: profile.phone || null,
    whatsapp: null,
    email: profile.email || null,
    website: null,
    address: null,
    latitude: null,
    longitude: null,
    createdAt: profile.createdAt,
    editable: false,
    record: null,
  };
}

/**
 * `GET /api/my-hotels` has to be declared above `GET /api/:hotelId` on the
 * backend router. The currently deployed backend has the wildcard first, so the
 * owner-scoped route answers 404 and pending/rejected hotels are unreachable.
 * When that happens the owner id is used to filter the public approved listing:
 * still real data, but it cannot contain unapproved rows, so the result is
 * flagged `partial` and the UI says so instead of pretending the list is empty.
 */
async function ownerHotels(
  token: string,
  ownerId: string
): Promise<ProviderListingsResult> {
  try {
    const hotels = await authorized<HotelRecord[]>(ownerListingsPath("hotel"), token, {
      fallback: "Could not load your hotels",
    });
    return {
      listings: hotels.map((hotel) => toListing("hotel", hotel)),
      partial: false,
    };
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;

    const approved = await api.get<HotelRecord[]>(publicHotelListingsPath());
    return {
      listings: approved
        .filter((hotel) => hotel.hotelOwnerId === ownerId)
        .map((hotel) => toListing("hotel", hotel)),
      partial: true,
    };
  }
}

export async function getProviderListings(
  token: string,
  kind: ProviderKind
): Promise<ProviderListingsResult> {
  if (kind === "restaurant") {
    const records = await authorized<RestaurantRecord[]>(
      ownerListingsPath("restaurant"),
      token,
      { fallback: "Could not load your restaurants" }
    );
    return {
      listings: records.map((record) => toListing("restaurant", record)),
      partial: false,
    };
  }

  if (kind === "hotel") {
    const profile = await getProviderProfile(token, kind);
    return ownerHotels(token, profile.id);
  }

  const [profile, places] = await Promise.all([
    getProviderProfile(token, kind),
    getPlacesIndex(),
  ]);

  return { listings: [guideListing(kind, profile, places)], partial: false };
}

/**
 * `rating` is required by the create schema but is a customer-facing score, so
 * a new listing starts at 0; the menu/category fields only exist on restaurants.
 * `review` is left untouched — reviews come from customers.
 */
function listingPayload(
  kind: ProviderKind,
  input: ProviderListingInput,
  options: { creating: boolean }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name,
    address: input.address,
    profile_logo: input.profileLogo,
    description: input.description || null,
    // A rating belongs to travellers, never to the owner, so a new listing
    // always starts at zero and an edit leaves the current score alone.
    rating: options.creating ? 0 : input.rating,
    images: input.images,
    latitude: input.latitude,
    longitude: input.longitude,
    booking_enabled: input.bookingEnabled,
  };

  if (input.phone) payload.phone_number = input.phone;
  if (input.whatsapp) payload.whatsapp_number = input.whatsapp;
  if (input.email) payload.email = input.email;
  if (input.website) payload.website = input.website;

  if (kind === "hotel") {
    payload.cost_per_night = input.costPerNight;
  } else {
    payload.menu = input.menu;
    payload.food_category = input.foodCategory as FoodCategory;
  }

  return payload;
}

export async function createProviderListing(
  token: string,
  kind: ProviderKind,
  input: ProviderListingInput
): Promise<ProviderListing> {
  const path = createListingPath(kind);
  if (!path) {
    throw new ProviderApiError(
      "Guide listings are created when you register.",
      400,
      {}
    );
  }

  const data = await authorized<{
    hotel?: HotelRecord;
    restaurent?: RestaurantRecord;
  }>(path, token, {
    method: "POST",
    body: {
      ...listingPayload(kind, input, { creating: true }),
      districtId: input.districtId,
    },
    fallback: "Could not create the service",
  });

  const record = data.hotel ?? data.restaurent;
  if (!record) {
    throw new ProviderApiError("Could not create the service", 200, {});
  }
  return toListing(kind, record);
}

export async function updateProviderListing(
  token: string,
  kind: ProviderKind,
  id: string,
  input: ProviderListingInput
): Promise<ProviderListing> {
  const path = listingPath(kind, id);
  if (!path) {
    throw new ProviderApiError(
      "Guide listings are managed from your profile.",
      400,
      {}
    );
  }

  const data = await authorized<{
    hotel?: HotelRecord;
    restaurent?: RestaurantRecord;
  }>(path, token, {
    method: "PATCH",
    body: listingPayload(kind, input, { creating: false }),
    fallback: "Could not save the service",
  });

  const record = data.hotel ?? data.restaurent;
  if (!record) {
    throw new ProviderApiError("Could not save the service", 200, {});
  }
  return toListing(kind, record);
}

export async function deleteProviderListing(
  token: string,
  kind: ProviderKind,
  id: string
): Promise<void> {
  const path = deleteListingPath(kind, id);
  if (!path) {
    throw new ProviderApiError(
      "Guide listings are managed from your profile.",
      400,
      {}
    );
  }

  await authorized<unknown>(path, token, {
    method: "DELETE",
    fallback: "Could not delete the service",
  });
}

/* -------------------------------------------------------------------------- */
/*  Requests                                                                  */
/* -------------------------------------------------------------------------- */

type RawCustomer = {
  id: string;
  name: string;
  email: string;
  phonenumber: string;
  profilepic: string | null;
};

type RawPlace = { id: string; name: string };

function customer(raw: RawCustomer | null | undefined) {
  return {
    id: raw?.id ?? "",
    name: raw?.name || "Traveller",
    email: raw?.email ?? "",
    phone: raw?.phonenumber ?? "",
    photo: raw?.profilepic ?? null,
  };
}

type RawHotelBooking = {
  id: string;
  hotelId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalAmount: number;
  status: RequestStatus;
  createdAt: string;
  hotel: HotelRecord;
  user: RawCustomer;
};

type RawRestaurantReservation = {
  id: string;
  restaurantId: string;
  reservationDate: string;
  guests: number;
  status: RequestStatus;
  createdAt: string;
  restaurent: RestaurantRecord;
  user: RawCustomer;
};

type RawSpecificGuideBooking = {
  id: string;
  specificGuideId: string;
  placeId: string;
  bookingDate: string;
  bookingTime: string | null;
  status: RequestStatus;
  numberOfPeople?: number;
  totalPrice?: number;
  isPackageTour?: boolean;
  packageName?: string;
  tourGuideName?: string;
  agencyName?: string;
  specificGuideStatus?: string;
  createdAt: string;
  user: RawCustomer;
  place: RawPlace | null;
};

type RawCommonGuideBooking = {
  id: string;
  commonGuideId: string;
  bookingDate: string;
  bookingTime: string | null;
  status: RequestStatus;
  numberOfPeople?: number;
  numberOfAdults?: number;
  numberOfChildren?: number;
  totalPrice?: number;
  package?: { id: string; name: string } | null;
  specificGuide?: { id: string; full_name: string } | null;
  specificGuideStatus?: string | null;
  bookingSnapshot?: unknown;
  createdAt: string;
  user: RawCustomer;
  selectedPlaces: { id: string; placeId: string; place: RawPlace | null }[];
};

export async function getProviderRequests(
  token: string,
  kind: ProviderKind
): Promise<ProviderRequest[]> {
  if (kind === "hotel") {
    const rows = await authorized<RawHotelBooking[]>(requestsPath("hotel"), token, {
      fallback: "Could not load your bookings",
    });

    return rows.map((row) => ({
      id: row.id,
      kind: "hotel_booking" as ProviderRequestKind,
      listingId: row.hotelId,
      listingName: row.hotel?.name ?? "Hotel stay",
      listingImage: row.hotel?.profile_logo ?? null,
      customer: customer(row.user),
      status: row.status,
      date: row.checkIn,
      endDate: row.checkOut,
      time: null,
      guests: row.guests,
      rooms: row.rooms,
      amount: typeof row.totalAmount === "number" ? row.totalAmount : null,
      places: [],
      createdAt: row.createdAt,
    }));
  }

  if (kind === "restaurant") {
    const rows = await authorized<RawRestaurantReservation[]>(
      requestsPath("restaurant"),
      token,
      { fallback: "Could not load your reservations" }
    );

    return rows.map((row) => ({
      id: row.id,
      kind: "restaurant_reservation" as ProviderRequestKind,
      listingId: row.restaurantId,
      listingName: row.restaurent?.name ?? "Restaurant table",
      listingImage: row.restaurent?.profile_logo ?? null,
      customer: customer(row.user),
      status: row.status,
      date: row.reservationDate,
      endDate: null,
      time: null,
      guests: row.guests,
      rooms: null,
      amount: null,
      places: [],
      createdAt: row.createdAt,
    }));
  }

  if (kind === "specific_guide") {
    const rows = await authorized<RawSpecificGuideBooking[]>(
      requestsPath("specific_guide"),
      token,
      { fallback: "Could not load your bookings" }
    );

    return rows.map((row) => ({
      id: row.id,
      kind: "specific_guide_booking" as ProviderRequestKind,
      listingId: row.placeId,
      listingName: row.isPackageTour
        ? `${row.packageName || "Package Tour"} (${row.agencyName || row.tourGuideName || "Tour Guide"})`
        : (row.place?.name ?? "Guided visit"),
      listingImage: null,
      customer: customer(row.user),
      status: row.status,
      date: row.bookingDate,
      endDate: null,
      time: row.bookingTime ?? null,
      guests: typeof row.numberOfPeople === "number" ? row.numberOfPeople : 1,
      rooms: null,
      amount: typeof row.totalPrice === "number" ? row.totalPrice : null,
      places: row.place ? [{ id: row.place.id, name: row.place.name }] : [],
      createdAt: row.createdAt,
    }));
  }

  const rows = await authorized<RawCommonGuideBooking[]>(
    requestsPath("common_guide"),
    token,
    { fallback: "Could not load your bookings" }
  );

  return rows.map((row) => {
    const places = (row.selectedPlaces ?? [])
      .filter((entry) => entry.place)
      .map((entry) => ({
        id: (entry.place as RawPlace).id,
        name: (entry.place as RawPlace).name,
      }));

    const guestCount =
      typeof row.numberOfPeople === "number" && row.numberOfPeople > 0
        ? row.numberOfPeople
        : (row.numberOfAdults ?? 1) + (row.numberOfChildren ?? 0);

    return {
      id: row.id,
      kind: "common_guide_booking" as ProviderRequestKind,
      listingId: row.commonGuideId,
      listingName:
        row.package?.name ??
        (places.map((place) => place.name).join(", ") || "Guided tour"),
      listingImage: null,
      customer: customer(row.user),
      status: row.status,
      date: row.bookingDate,
      endDate: null,
      time: row.bookingTime ?? null,
      guests: guestCount,
      rooms: null,
      amount: typeof row.totalPrice === "number" ? row.totalPrice : null,
      places,
      createdAt: row.createdAt,
    };
  });
}

export async function getAvailableSpecificGuides(
  token: string
): Promise<SpecificGuideSummary[]> {
  return authorized<SpecificGuideSummary[]>(
    "/services/provider/commonguide/profile/api/specific-guides",
    token,
    { fallback: "Could not load available specific guides" }
  );
}

export async function updateProviderRequestStatus(
  token: string,
  kind: ProviderKind,
  id: string,
  status: RequestStatus
): Promise<void> {
  const fallback =
    status === "CONFIRMED"
      ? "We couldn't accept this request. Please try again."
      : "We couldn't update this request. Please try again.";

  await authorized<unknown>(requestPath(kind, id), token, {
    method: "PATCH",
    body: { status },
    fallback,
  });
}

/**
 * Dashboard counters. There is no statistics endpoint, so these are derived
 * from the listing and request records the backend already returned.
 */
export function buildStats(
  listings: ProviderListing[],
  requests: ProviderRequest[],
  kind: ProviderKind
): ProviderStats {
  const count = (status: RequestStatus) =>
    requests.filter((request) => request.status === status).length;

  return {
    totalRequests: requests.length,
    pending: count("PENDING"),
    confirmed: count("CONFIRMED"),
    completed: count("COMPLETED"),
    cancelled: count("CANCELLED"),
    rejected: count("REJECTED"),
    listingCount: listings.length,
    activeListingCount: listings.filter((listing) => listing.active).length,
    earnings:
      kind === "hotel"
        ? requests
            .filter(
              (request) =>
                request.status === "CONFIRMED" ||
                request.status === "COMPLETED"
            )
            .reduce((sum, request) => sum + (request.amount ?? 0), 0)
        : null,
  };
}

/** Public approved listing counts, used by the dashboard "live" hint. */
export async function getPublicCounts(): Promise<{
  hotels: number;
  restaurants: number;
}> {
  const [hotels, restaurants] = await Promise.all([
    api.get<HotelRecord[]>(publicHotelListingsPath()).catch(() => []),
    api
      .get<RestaurantRecord[]>(publicRestaurantListingsPath())
      .catch(() => []),
  ]);
  return { hotels: hotels.length, restaurants: restaurants.length };
}

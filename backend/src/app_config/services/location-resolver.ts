const MAX_REDIRECTS = 8;
const REQUEST_TIMEOUT_MS = 10_000;

const GOOGLE_MAPS_HOST = /^(?:(?:www|maps)\.)?google\.(?:com|[a-z]{2,3}(?:\.[a-z]{2})?)$/i;

function isAllowedResolvedUrl(url: URL): boolean {
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    (url.hostname === "maps.app.goo.gl" || GOOGLE_MAPS_HOST.test(url.hostname))
  );
}

function parseCoordinates(url: URL): { latitude: number; longitude: number } | null {
  const finalUrl = `${url.href} ${decodeURIComponent(url.href)}`;
  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = finalUrl.match(pattern);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);
      if (isValidCoordinates(latitude, longitude)) return { latitude, longitude };
    }
  }

  for (const key of ["q", "query", "ll", "center"]) {
    const value = url.searchParams.get(key);
    const match = value?.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);
      if (isValidCoordinates(latitude, longitude)) return { latitude, longitude };
    }
  }

  return null;
}

function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export async function resolveGoogleMapsShortLink(value: string) {
  let currentUrl: URL;
  try {
    currentUrl = new URL(value);
  } catch {
    throw new Error("Invalid Google Maps short link");
  }

  if (
    currentUrl.protocol !== "https:" ||
    currentUrl.hostname !== "maps.app.goo.gl" ||
    currentUrl.username ||
    currentUrl.password ||
    currentUrl.port ||
    currentUrl.pathname === "/"
  ) {
    throw new Error("Only https://maps.app.goo.gl/* links are accepted");
  }

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (!isAllowedResolvedUrl(currentUrl)) {
      throw new Error("Google Maps short link redirected to a disallowed host");
    }

    const response = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "Mozilla/5.0 (compatible; TravelAdmin/1.0)" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirects === MAX_REDIRECTS) {
        throw new Error("Google Maps short link could not be resolved");
      }
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    if (!response.ok || !currentUrl.pathname.toLowerCase().includes("map")) {
      throw new Error("Google Maps short link could not be resolved");
    }

    const coordinates = parseCoordinates(currentUrl);
    if (!coordinates) throw new Error("Coordinates were not found in the resolved location");
    return coordinates;
  }

  throw new Error("Google Maps short link could not be resolved");
}
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getBackendUrl(): string {
  const configured = (
    process.env.INTERNAL_API_URL ??
    process.env.BACKEND_URL ??
    "http://localhost:8080"
  ).trim();
  return configured.replace(/\/+$/, "");
}

/**
 * Same-origin API route for published Client App branding settings.
 * Proxies to backend /api/settings to eliminate browser CORS/port issues.
 */
export async function GET() {
  try {
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/api/settings`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch settings from backend" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("[api/settings] Proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

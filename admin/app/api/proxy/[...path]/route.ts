import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { backendRequest } from "@/lib/api/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const backendPath = `/${path.join("/")}`;

  // Authentication is handled exclusively by NextAuth at /api/auth/[...nextauth].
  // Reject any attempt to proxy backend authentication endpoints.
  if (/\/api\/auth\//i.test(backendPath)) {
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  // Forward the browser's cookies verbatim. When an authorized Auth.js admin
  // session exists, the verified backend admin token inside the encrypted
  // session becomes the `token` cookie sent to the backend so the existing
  // adminAuthMiddleware authenticates the request. The backend token is never
  // exposed to browser JavaScript.
  const cookie = req.headers.get("cookie") ?? "";
  let forwardedCookie = cookie;
  const adminSession = await auth();
  if (adminSession?.adminToken) {
    const withoutToken = cookie
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part && !part.toLowerCase().startsWith("token="));
    const tokenCookie = `token=${encodeURIComponent(adminSession.adminToken)}`;
    forwardedCookie =
      withoutToken.length > 0
        ? `${withoutToken.join("; ")}; ${tokenCookie}`
        : tokenCookie;
  }

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.text();

  const backendRes = await backendRequest(backendPath, {
    method: req.method,
    body: body || undefined,
    cookie: forwardedCookie,
  });

  const text = await backendRes.text();

  // Copy the response. Includes the backend's Set-Cookie so the httpOnly
  // token cookie lands on the admin origin (with Secure stripped so local
  // http dev keeps working).
  const headers = new Headers();
  headers.set("content-type", backendRes.headers.get("content-type") ?? "application/json");
  headers.set("cache-control", "no-store");

  const setCookies = backendRes.headers.getSetCookie();
  for (const raw of setCookies) {
    const normalized = raw
      .split(/;\s*/)
      .filter((part) => !/^secure$/i.test(part))
      .join("; ");
    headers.append("set-cookie", normalized);
  }

  return new Response(text, { status: backendRes.status, headers });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
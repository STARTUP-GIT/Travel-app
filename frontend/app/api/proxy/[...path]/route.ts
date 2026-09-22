import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { backendRequest, backendSigninWithEmail } from "@/lib/api/server";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  const backendPath = `/${path.join("/")}`;

  const session = await auth();
  let token = session?.backendToken;

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.text();

  let backendRes = await backendRequest(backendPath, {
    method: req.method,
    body: body || undefined,
    token: token || null,
  });

  // Heal expired backend tokens transparently by re-signing-in with the
  // customer's email once per request.
  if (
    backendRes.status === 401 &&
    token &&
    session?.user?.email &&
    !req.headers.get("x-no-retry")
  ) {
    const freshToken = await backendSigninWithEmail(session.user.email);
    if (freshToken) {
      token = freshToken;
      backendRes = await backendRequest(backendPath, {
        method: req.method,
        body: body || undefined,
        token,
        headers: { "x-no-retry": "1" },
      });
    }
  }

  const text = await backendRes.text();

  return new NextResponse(text, {
    status: backendRes.status,
    headers: {
      "content-type":
        backendRes.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
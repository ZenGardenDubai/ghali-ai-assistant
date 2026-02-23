import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * Call a Convex admin HTTP endpoint with Bearer token auth.
 * Returns the parsed JSON response or a NextResponse error.
 */
export async function adminConvexFetch(
  path: string,
  body: Record<string, unknown> = {}
): Promise<NextResponse> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const isAdmin = (sessionClaims?.metadata as Record<string, unknown> | undefined)?.isAdmin === true;
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (!CONVEX_SITE_URL || !INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const response = await fetch(`${CONVEX_SITE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: text || "Convex request failed" },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (err) {
    console.error(`Admin API error (${path}):`, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

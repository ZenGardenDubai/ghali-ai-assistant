import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/api/link-phone(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    const { userId, sessionClaims } = await auth();

    // Not logged in → redirect to admin sign-in
    if (!userId) {
      return NextResponse.redirect(new URL("/auth/admin-sign-in", req.url));
    }

    // Logged in but not admin → redirect home
    const isAdmin = (sessionClaims?.metadata as Record<string, unknown> | undefined)?.isAdmin === true;
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

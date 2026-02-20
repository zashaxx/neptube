import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Routes that require authentication — Clerk will redirect to sign-in
 * if the user is not logged in.
 */
const isProtectedRoute = createRouteMatcher([
  "/protected(.*)",
  "/studio(.*)",
  "/settings(.*)",
]);

/**
 * Fully public routes where Clerk should NOT attempt any handshake/JWKS
 * resolution. This prevents the "Rate exceeded" errors from Clerk's BAPI.
 */
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
  "/feed(.*)",
  "/watch(.*)",
  "/embed(.*)",
  "/shorts(.*)",
  "/channel(.*)",
  "/community(.*)",
  "/premium",
  "/api/webhooks(.*)",
  "/api/uploadthing(.*)",
  "/api/payments(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Skip auth enforcement on public routes
  if (isPublicRoute(req)) return;

  // Enforce auth on protected routes
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
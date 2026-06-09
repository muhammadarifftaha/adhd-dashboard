import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Proxy runs on the Node.js runtime in Next 16, so Prisma/pg is usable here.
// NOTE: this gate is UX only — server actions can bypass proxy matching, so the
// create-admin action MUST also verify no admin exists before creating one.
async function hasAdminUser() {
  const adminCount = await prisma.user.count({ where: { role: "admin" } });
  return adminCount > 0;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isSetupRoute = pathname === "/setup" || pathname.startsWith("/setup/");
  const isAuthRoute = pathname.startsWith("/auth");

  const adminExists = await hasAdminUser();

  // First-run setup gate: with no admin yet, funnel everyone to /setup.
  if (!adminExists) {
    if (!isSetupRoute) {
      return NextResponse.redirect(new URL("/setup", request.url));
    }
    // Allow the setup page itself — no session required to bootstrap.
    return NextResponse.next();
  }

  // An admin exists: the setup page is permanently off-limits.
  if (isSetupRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Normal auth gating.
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session && !isAuthRoute) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude API routes, Next internals, metadata files (favicon/sitemap/robots),
    // and all shipped static asset extensions so auth/redirect gating never blocks
    // assets and never pays the per-request DB/auth cost for them.
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};

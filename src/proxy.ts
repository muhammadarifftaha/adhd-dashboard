import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth"; // path to your auth file

export async function proxy(request: NextRequest) {
  const isPublicRoute = ["/auth"].some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude API routes, static files, image optimizations, and .png files
    "/((?!api|_next/static|_next/image|.*\\.png$).*)",
  ],
};

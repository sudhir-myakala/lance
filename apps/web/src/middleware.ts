import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/app");

  if (!isProtected) return NextResponse.next();

  // Check for the refresh_token httpOnly cookie as a session signal
  const hasSession = request.cookies.has("refresh_token");

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/app/:path*"],
};

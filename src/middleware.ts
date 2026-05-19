import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "scooter_unlock";

export function middleware(req: NextRequest) {
  const expected = process.env.APP_PASSWORD;
  // If no password is configured, allow everything (dev / fresh install).
  if (!expected) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Allow the login page + the login server action endpoint to render unauthenticated.
  if (pathname === "/login") return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === expected) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  url.searchParams.delete("key");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon).*)",
  ],
};

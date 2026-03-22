import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COMING_SOON = process.env.NEXT_PUBLIC_COMING_SOON === "true";

const ALLOWED_PREFIXES = ["/_next", "/favicon", "/static", "/api"];
const ALLOWED_EXACT = ["/", "/fr"];

export function middleware(request: NextRequest) {
  if (!COMING_SOON) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const allowed =
    ALLOWED_EXACT.includes(pathname) ||
    ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!allowed) {
    const acceptLang = request.headers.get("accept-language") ?? "";
    const prefersFr =
      pathname.startsWith("/fr") ||
      (acceptLang.toLowerCase().startsWith("fr") &&
        !acceptLang.toLowerCase().startsWith("en"));
    return NextResponse.redirect(
      new URL(prefersFr ? "/fr" : "/", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

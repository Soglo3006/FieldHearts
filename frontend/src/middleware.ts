import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COMING_SOON = process.env.NEXT_PUBLIC_COMING_SOON === "true";

const ALLOWED_PREFIXES = ["/_next", "/favicon", "/static", "/api"];
const ALLOWED_EXACT = ["/", "/fr"];

export function middleware(request: NextRequest) {
  // Coming soon redirect logic
  if (COMING_SOON) {
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
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Build connect-src: include the backend API URL so fetch() is allowed
  const apiOrigin =
    (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api")
      .replace(/\/api$/, "")
      .replace(/\/$/, "") || "http://localhost:5000";

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://js.stripe.com https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
    "img-src 'self' data: https: blob: https://*.supabase.co https://images.unsplash.com https://maps.googleapis.com https://maps.gstatic.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${apiOrigin} https://maps.googleapis.com`,
    "frame-src 'none' https://js.stripe.com",
    "object-src 'none'",
    "worker-src blob:",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

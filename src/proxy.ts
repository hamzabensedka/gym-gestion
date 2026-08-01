import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { Role } from "@prisma/client";
import { SESSION_COOKIE } from "@/lib/session";
import { MEMBER_SESSION_COOKIE } from "@/lib/member-session";

const ADMIN_ONLY_PREFIXES = [
  "/dashboard",
  "/attendance",
  "/staff",
  "/settings",
  "/members/new",
  "/onboarding",
];
const CHECKIN_PREFIXES = ["/scan", "/manual"];

const MEMBER_PUBLIC_PREFIXES = ["/member/invite"];

function nextWithPathname(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

function getStaffSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

function getMemberSecret() {
  const secret =
    process.env.MEMBER_SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

async function getStaffRole(request: NextRequest): Promise<Role | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const secret = getStaffSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role as Role;
  } catch {
    return null;
  }
}

async function hasMemberSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return false;

  const secret = getMemberSecret();
  if (!secret) return false;

  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

function isMemberPublicRoute(pathname: string): boolean {
  return MEMBER_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isMemberRoute(pathname: string): boolean {
  return pathname === "/member" || pathname.startsWith("/member/");
}

function isAdminOnlyRoute(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/member/auth/login") ||
      pathname.startsWith("/api/member/auth/set-password")) {
    return nextWithPathname(request, pathname);
  }

  // Member API routes handle their own session checks (return JSON, never redirect)
  if (pathname.startsWith("/api/member/")) {
    return nextWithPathname(request, pathname);
  }

  if (pathname === "/member/login" || pathname.startsWith("/member/login/")) {
    const memberLoggedIn = await hasMemberSession(request);
    if (memberLoggedIn) {
      return NextResponse.redirect(new URL("/member", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isMemberRoute(pathname)) {
    if (isMemberPublicRoute(pathname)) {
      return nextWithPathname(request, pathname);
    }

    const memberLoggedIn = await hasMemberSession(request);
    if (memberLoggedIn) {
      return nextWithPathname(request, pathname);
    }

    const staffRole = await getStaffRole(request);
    if (staffRole) {
      return NextResponse.redirect(
        new URL(staffRole === Role.ADMIN ? "/dashboard" : "/scan", request.url),
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    const memberLoggedIn = await hasMemberSession(request);
    const staffRole = await getStaffRole(request);
    if (pathname.startsWith("/login")) {
      if (memberLoggedIn) {
        return NextResponse.redirect(new URL("/member", request.url));
      }
      if (staffRole) {
        return NextResponse.redirect(
          new URL(staffRole === Role.ADMIN ? "/dashboard" : "/scan", request.url),
        );
      }
    }
    return nextWithPathname(request, pathname);
  }

  const role = await getStaffRole(request);
  const memberLoggedIn = await hasMemberSession(request);

  if (!role) {
    if (memberLoggedIn) {
      return NextResponse.redirect(new URL("/member", request.url));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminOnlyRoute(pathname)) {
    if (role !== Role.ADMIN) {
      return NextResponse.redirect(new URL("/scan", request.url));
    }
  }

  if (CHECKIN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (role !== Role.ADMIN && role !== Role.STAFF) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return nextWithPathname(request, pathname);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/members",
    "/members/:path*",
    "/attendance/:path*",
    "/staff/:path*",
    "/settings/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/today",
    "/today/:path*",
    "/account",
    "/account/:path*",
    "/scan/:path*",
    "/manual/:path*",
    "/member",
    "/member/:path*",
    "/login",
    "/api/member/:path*",
  ],
};

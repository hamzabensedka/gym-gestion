import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { MemberSession } from "./member-auth";

const MEMBER_SESSION_COOKIE = "member_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function getSecret() {
  const secret =
    process.env.MEMBER_SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createMemberSession(member: MemberSession) {
  const token = await new SignJWT({ ...member })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(MEMBER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroyMemberSession() {
  const cookieStore = await cookies();
  cookieStore.delete(MEMBER_SESSION_COOKIE);
}

export async function getMemberSession(): Promise<MemberSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as MemberSession;
  } catch {
    return null;
  }
}

export async function requireMemberSession(): Promise<MemberSession> {
  const session = await getMemberSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export { MEMBER_SESSION_COOKIE };

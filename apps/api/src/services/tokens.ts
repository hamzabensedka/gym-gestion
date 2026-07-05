import { randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { prisma } from "../db";

const ACCESS_TTL_SEC = 60 * 60;
const REFRESH_TTL_SEC = 60 * 60 * 24 * 30;

export type StaffTokenPayload = {
  sub: string;
  gymId: string;
  role: Role;
  type: "staff";
  name: string;
  email: string;
};

export type MemberTokenPayload = {
  sub: string;
  gymId: string;
  type: "member";
  name: string;
  email: string;
};

function staffSecret() {
  const s = process.env.STAFF_JWT_SECRET ?? process.env.SESSION_SECRET;
  if (!s) throw new Error("STAFF_JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

function memberSecret() {
  const s = process.env.MEMBER_JWT_SECRET ?? process.env.MEMBER_SESSION_SECRET;
  if (!s) throw new Error("MEMBER_JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

export function generateRefreshTokenValue(): string {
  return randomBytes(48).toString("hex");
}

export async function createStaffTokens(user: {
  id: string;
  gymId: string;
  role: Role;
  name: string;
  email: string;
}) {
  const payload: StaffTokenPayload = {
    sub: user.id,
    gymId: user.gymId,
    role: user.role,
    type: "staff",
    name: user.name,
    email: user.email,
  };

  const accessToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(staffSecret());

  const refreshValue = generateRefreshTokenValue();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000);

  await prisma.refreshToken.create({
    data: {
      token: refreshValue,
      userId: user.id,
      type: "staff",
      expiresAt,
    },
  });

  return { accessToken, refreshToken: refreshValue, expiresIn: ACCESS_TTL_SEC };
}

export async function createMemberTokens(member: {
  id: string;
  gymId: string;
  name: string;
  email: string;
}) {
  const payload: MemberTokenPayload = {
    sub: member.id,
    gymId: member.gymId,
    type: "member",
    name: member.name,
    email: member.email,
  };

  const accessToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(memberSecret());

  const refreshValue = generateRefreshTokenValue();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000);

  await prisma.refreshToken.create({
    data: {
      token: refreshValue,
      memberId: member.id,
      type: "member",
      expiresAt,
    },
  });

  return { accessToken, refreshToken: refreshValue, expiresIn: ACCESS_TTL_SEC };
}

export async function verifyStaffAccessToken(token: string): Promise<StaffTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, staffSecret());
    if (payload.type !== "staff") return null;
    return payload as unknown as StaffTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyMemberAccessToken(token: string): Promise<MemberTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, memberSecret());
    if (payload.type !== "member") return null;
    return payload as unknown as MemberTokenPayload;
  } catch {
    return null;
  }
}

export async function refreshStaffTokens(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.type !== "staff" || !stored.userId || stored.expiresAt < new Date()) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
  });
  if (!user) return null;

  await prisma.refreshToken.delete({ where: { id: stored.id } });
  return createStaffTokens(user);
}

export async function refreshMemberTokens(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.type !== "member" || !stored.memberId || stored.expiresAt < new Date()) {
    return null;
  }

  const member = await prisma.member.findUnique({ where: { id: stored.memberId } });
  if (!member?.email) return null;

  await prisma.refreshToken.delete({ where: { id: stored.id } });
  return createMemberTokens({
    id: member.id,
    gymId: member.gymId,
    name: member.fullName,
    email: member.email,
  });
}

export async function revokeRefreshToken(refreshToken: string) {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

export async function revokeAllStaffTokens(userId: string) {
  await prisma.refreshToken.deleteMany({ where: { userId, type: "staff" } });
}

export async function revokeAllMemberTokens(memberId: string) {
  await prisma.refreshToken.deleteMany({ where: { memberId, type: "member" } });
}

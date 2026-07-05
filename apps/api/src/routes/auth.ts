import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { loginSchema, memberLoginSchema, memberSetPasswordSchema } from "@gym/shared/validations";
import { canMemberLogin } from "@gym/shared/member-auth";
import { prisma } from "../db";
import {
  createMemberTokens,
  createStaffTokens,
  refreshMemberTokens,
  refreshStaffTokens,
  revokeRefreshToken,
  revokeAllMemberTokens,
  revokeAllStaffTokens,
} from "../services/tokens";
import { loginRateLimit } from "../middleware/rate-limit";
import { requireMember, requireStaff } from "../middleware/auth";
import { MemberInviteStatus } from "@prisma/client";

export const authRoutes = new Hono();

authRoutes.post("/staff/login", loginRateLimit, async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION", message: "Données invalides" } }, 422);
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email },
    include: { gym: { select: { name: true } } },
  });

  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return c.json({ error: { code: "INVALID_CREDENTIALS", message: "Identifiants invalides" } }, 401);
  }

  const tokens = await createStaffTokens(user);
  return c.json({
    data: {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        gymId: user.gymId,
        gymName: user.gym.name,
      },
    },
  });
});

authRoutes.post("/staff/refresh", async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) {
    return c.json({ error: { code: "VALIDATION", message: "Token requis" } }, 422);
  }
  const tokens = await refreshStaffTokens(refreshToken);
  if (!tokens) {
    return c.json({ error: { code: "INVALID_TOKEN", message: "Session expirée" } }, 401);
  }
  return c.json({ data: tokens });
});

authRoutes.post("/staff/logout", requireStaff, async (c) => {
  const { refreshToken } = await c.req.json().catch(() => ({}));
  if (refreshToken) await revokeRefreshToken(refreshToken);
  await revokeAllStaffTokens(c.get("staff").sub);
  return c.json({ data: { ok: true } });
});

authRoutes.get("/staff/me", requireStaff, async (c) => {
  const staff = c.get("staff");
  const user = await prisma.user.findUnique({
    where: { id: staff.sub },
    include: { gym: { select: { name: true } } },
  });
  if (!user) {
    return c.json({ error: { code: "NOT_FOUND", message: "Utilisateur introuvable" } }, 404);
  }
  return c.json({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      gymId: user.gymId,
      gymName: user.gym.name,
    },
  });
});

authRoutes.post("/member/login", loginRateLimit, async (c) => {
  const body = await c.req.json();
  const parsed = memberLoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION", message: "Données invalides" } }, 422);
  }

  const email = parsed.data.email.toLowerCase();
  const member = await prisma.member.findFirst({
    where: { email },
    include: { gym: { select: { name: true } } },
  });

  if (!member?.passwordHash || !canMemberLogin(member.inviteStatus)) {
    return c.json({ error: { code: "INVALID_CREDENTIALS", message: "Identifiants invalides" } }, 401);
  }

  if (!(await bcrypt.compare(parsed.data.password, member.passwordHash))) {
    return c.json({ error: { code: "INVALID_CREDENTIALS", message: "Identifiants invalides" } }, 401);
  }

  await prisma.member.update({
    where: { id: member.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await createMemberTokens({
    id: member.id,
    gymId: member.gymId,
    name: member.fullName,
    email: member.email!,
  });

  return c.json({
    data: {
      ...tokens,
      member: {
        id: member.id,
        name: member.fullName,
        email: member.email,
        gymId: member.gymId,
        gymName: member.gym.name,
      },
    },
  });
});

authRoutes.post("/member/refresh", async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) {
    return c.json({ error: { code: "VALIDATION", message: "Token requis" } }, 422);
  }
  const tokens = await refreshMemberTokens(refreshToken);
  if (!tokens) {
    return c.json({ error: { code: "INVALID_TOKEN", message: "Session expirée" } }, 401);
  }
  return c.json({ data: tokens });
});

authRoutes.post("/member/logout", requireMember, async (c) => {
  const { refreshToken } = await c.req.json().catch(() => ({}));
  if (refreshToken) await revokeRefreshToken(refreshToken);
  await revokeAllMemberTokens(c.get("member").sub);
  return c.json({ data: { ok: true } });
});

authRoutes.get("/member/me", requireMember, async (c) => {
  const session = c.get("member");
  const member = await prisma.member.findFirst({
    where: { id: session.sub, gymId: session.gymId },
    include: { gym: { select: { name: true, cardTheme: true } } },
  });
  if (!member) {
    return c.json({ error: { code: "NOT_FOUND", message: "Membre introuvable" } }, 404);
  }
  const { getMemberStatus } = await import("@gym/shared/auth");
  const status = getMemberStatus(member.subscriptionEnd);
  return c.json({
    data: {
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      gymName: member.gym.name,
      cardTheme: member.gym.cardTheme,
      subscriptionEnd: member.subscriptionEnd.toISOString(),
      subscriptionStart: member.subscriptionStart.toISOString(),
      status,
      isActive: status === "ACTIVE",
    },
  });
});

authRoutes.get("/member/invite/:token", async (c) => {
  const token = c.req.param("token");
  const member = await prisma.member.findFirst({
    where: { inviteToken: token },
    include: { gym: { select: { name: true } } },
  });

  if (
    !member ||
    member.inviteStatus === MemberInviteStatus.DISABLED ||
    !member.inviteExpiresAt ||
    member.inviteExpiresAt < new Date()
  ) {
    return c.json({ error: { code: "INVALID_TOKEN", message: "Lien invalide ou expiré" } }, 404);
  }

  return c.json({
    data: {
      gymName: member.gym.name,
      memberName: member.fullName,
      email: member.email,
    },
  });
});

authRoutes.post("/member/set-password", async (c) => {
  const body = await c.req.json();
  const parsed = memberSetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Données invalides" } }, 422);
  }

  const member = await prisma.member.findFirst({
    where: { inviteToken: parsed.data.token },
    include: { gym: { select: { name: true } } },
  });

  if (
    !member ||
    member.inviteStatus === MemberInviteStatus.DISABLED ||
    !member.inviteExpiresAt ||
    member.inviteExpiresAt < new Date()
  ) {
    return c.json({ error: { code: "INVALID_TOKEN", message: "Lien invalide ou expiré" } }, 404);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.member.update({
    where: { id: member.id },
    data: {
      passwordHash,
      inviteStatus: MemberInviteStatus.ACTIVE,
      inviteToken: null,
      inviteExpiresAt: null,
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    },
  });

  const tokens = await createMemberTokens({
    id: member.id,
    gymId: member.gymId,
    name: member.fullName,
    email: member.email!,
  });

  return c.json({
    data: {
      ...tokens,
      member: {
        id: member.id,
        name: member.fullName,
        email: member.email,
        gymId: member.gymId,
        gymName: member.gym.name,
      },
    },
  });
});

authRoutes.delete("/member/account", requireMember, async (c) => {
  const session = c.get("member");
  await revokeAllMemberTokens(session.sub);
  await prisma.member.update({
    where: { id: session.sub, gymId: session.gymId },
    data: {
      inviteStatus: MemberInviteStatus.DISABLED,
      passwordHash: null,
      inviteToken: null,
      inviteExpiresAt: null,
    },
  });
  return c.json({ data: { ok: true } });
});

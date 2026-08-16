import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { AccessMode, MemberInviteStatus, MemberStatus, Prisma, Role } from "@prisma/client";
import { addDays, endOfDay, startOfDay } from "date-fns";
import {
  memberSchema,
  staffSchema,
  gymSchema,
  passwordSchema,
  paymentSchema,
  freezeMemberSchema,
} from "@gym/shared/validations";
import {
  getMemberStatus,
} from "@gym/shared/auth";
import { resolveMemberStatusOnSubscriptionChange } from "../services/freeze";
import { withOnboardedMemberFilter } from "@gym/shared/member-auth";
import { memberExportSearchWhere } from "../lib/member-export-search";
import { extendSubscription } from "@gym/shared/subscription";
import { generateMemberQrPayload } from "@gym/shared/member-qr";
import { normalizePhone } from "@gym/shared/format";
import { canAddStaff } from "@gym/shared/gym-features";
import { buildAccessExportCsv } from "@gym/shared/access-export";
import { normalizeBadgeNumber } from "@gym/shared/badge";
import {
  getPlanLimits,
  isAccessMode,
  isPlan,
  modesAllowedForPlan,
  planHasFeature,
} from "@gym/shared/plans";
import { prisma } from "../db";
import { assertGymFeature, featureLockedResponse, isFeatureLockedError } from "../lib/features";
import { requireAdmin, requireCheckinAccess, requireDeskAccess, requireMember, requireStaff } from "../middleware/auth";
import { issueMemberInvite } from "../services/member-invite";

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function normalizeEmail(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function uniqueConflictError(error: unknown): "form.badgeExists" | "form.phoneExists" {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = error.meta?.target;
    const fields = Array.isArray(target)
      ? target.map(String)
      : typeof target === "string"
        ? [target]
        : [];
    if (fields.some((f) => f.includes("badgeNumber"))) {
      return "form.badgeExists";
    }
  }
  return "form.phoneExists";
}

export const membersRoutes = new Hono();

membersRoutes.get("/search", requireCheckinAccess, async (c) => {
  const staff = c.get("staff");
  const query = c.req.query("q")?.trim() ?? "";
  if (query.length < 2) {
    return c.json({ data: [] });
  }

  const members = await prisma.member.findMany({
    where: withOnboardedMemberFilter({
      gymId: staff.gymId,
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    }),
    orderBy: { fullName: "asc" },
    take: 10,
    select: {
      id: true,
      fullName: true,
      phone: true,
      status: true,
      subscriptionEnd: true,
    },
  });

  return c.json({ data: members });
});

membersRoutes.get("/export", requireAdmin, async (c) => {
  const staff = c.get("staff");
  try {
    await assertGymFeature(staff.gymId, "csv_export");
  } catch (error) {
    if (isFeatureLockedError(error)) {
      return featureLockedResponse(c);
    }
    throw error;
  }

  const q = c.req.query("q") ?? "";
  const members = await prisma.member.findMany({
    where: withOnboardedMemberFilter({
      gymId: staff.gymId,
      ...memberExportSearchWhere(q),
    }),
    orderBy: { fullName: "asc" },
  });

  const header = "Nom,Téléphone,Email,Statut,Début,Fin,Mensualité\n";
  const rows = members
    .map((m) =>
      [
        m.fullName,
        m.phone,
        m.email ?? "",
        m.status,
        m.subscriptionStart.toISOString().slice(0, 10),
        m.subscriptionEnd.toISOString().slice(0, 10),
        m.monthlyFee.toString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");

  return c.text(header + rows, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="members.csv"',
  });
});

membersRoutes.get("/", requireDeskAccess, async (c) => {
  const staff = c.get("staff");
  const filter = c.req.query("f") ?? "all";
  const q = c.req.query("q")?.trim() ?? "";
  const now = new Date();
  const expiringBefore = endOfDay(addDays(now, 7));

  let where = withOnboardedMemberFilter({ gymId: staff.gymId });

  if (filter === "active") {
    where = { ...where, status: MemberStatus.ACTIVE };
  } else if (filter === "expired") {
    where = { ...where, status: MemberStatus.EXPIRED };
  } else if (filter === "expiring") {
    where = {
      ...where,
      status: MemberStatus.ACTIVE,
      subscriptionEnd: { lte: expiringBefore, gte: startOfDay(now) },
    };
  } else if (filter === "frozen") {
    where = { ...where, status: MemberStatus.FROZEN };
  }

  if (q) {
    where = {
      ...where,
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    };
  }

  const members = await prisma.member.findMany({
    where,
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      status: true,
      subscriptionEnd: true,
      subscriptionStart: true,
      monthlyFee: true,
      inviteStatus: true,
    },
  });

  return c.json({ data: members });
});

membersRoutes.get("/:id", requireDeskAccess, async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");

  const member = await prisma.member.findFirst({
    where: { id, gymId: staff.gymId },
    include: {
      checkins: {
        orderBy: { timestamp: "desc" },
        take: 20,
        select: { id: true, timestamp: true },
      },
    },
  });

  if (!member) {
    return c.json({ error: { code: "NOT_FOUND", message: "Membre introuvable" } }, 404);
  }

  const { passwordHash: _, ...safe } = member;
  return c.json({ data: safe });
});

membersRoutes.post("/", requireAdmin, async (c) => {
  const staff = c.get("staff");
  const body = await c.req.json();
  const parsed = memberSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Données invalides" } }, 422);
  }

  const gym = await prisma.gym.findUniqueOrThrow({
    where: { id: staff.gymId },
    select: { plan: true },
  });
  const canBadge = planHasFeature(gym.plan, "badge_numbers");
  const badgeNumber = canBadge
    ? normalizeBadgeNumber(parsed.data.badgeNumber)
    : null;

  const subscriptionEnd = parseDate(parsed.data.subscriptionEnd);
  const email = normalizeEmail(parsed.data.email);
  const sendInvite = Boolean(body.sendInvite);

  try {
    const created = await prisma.member.create({
      data: {
        gymId: staff.gymId,
        fullName: parsed.data.fullName.trim(),
        phone: normalizePhone(parsed.data.phone),
        email,
        subscriptionStart: parseDate(parsed.data.subscriptionStart),
        subscriptionEnd,
        status: getMemberStatus(subscriptionEnd),
        notes: parsed.data.notes?.trim() || null,
        monthlyFee: parsed.data.monthlyFee,
        badgeNumber: canBadge ? badgeNumber : null,
        inviteStatus: email && sendInvite ? MemberInviteStatus.PENDING : null,
      },
    });

    if (email && sendInvite) {
      const inviteResult = await issueMemberInvite(created.id, staff.gymId);
      if ("error" in inviteResult) {
        return c.json({ error: { code: "INVITE_FAILED", message: inviteResult.error } }, 422);
      }
    }

    return c.json({ data: { id: created.id } }, 201);
  } catch (error) {
    return c.json({ error: { code: "CONFLICT", message: uniqueConflictError(error) } }, 409);
  }
});

membersRoutes.patch("/:id", requireAdmin, async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = memberSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Données invalides" } }, 422);
  }

  const gym = await prisma.gym.findUniqueOrThrow({
    where: { id: staff.gymId },
    select: { plan: true },
  });
  const canBadge = planHasFeature(gym.plan, "badge_numbers");

  const existing = await prisma.member.findFirst({
    where: { id, gymId: staff.gymId },
    select: { email: true, inviteStatus: true, status: true },
  });
  if (!existing) {
    return c.json({ error: { code: "NOT_FOUND", message: "Membre introuvable" } }, 404);
  }

  const subscriptionEnd = parseDate(parsed.data.subscriptionEnd);
  const email = normalizeEmail(parsed.data.email);
  const sendInvite = Boolean(body.sendInvite);
  const emailChanged = email !== existing.email;

  try {
    await prisma.member.update({
      where: { id, gymId: staff.gymId },
      data: {
        fullName: parsed.data.fullName.trim(),
        phone: normalizePhone(parsed.data.phone),
        email,
        subscriptionStart: parseDate(parsed.data.subscriptionStart),
        subscriptionEnd,
        status: resolveMemberStatusOnSubscriptionChange(existing.status, subscriptionEnd),
        notes: parsed.data.notes?.trim() || null,
        monthlyFee: parsed.data.monthlyFee,
        ...(canBadge
          ? { badgeNumber: normalizeBadgeNumber(parsed.data.badgeNumber) }
          : {}),
      },
    });
  } catch (error) {
    return c.json({ error: { code: "CONFLICT", message: uniqueConflictError(error) } }, 409);
  }

  if (email && (sendInvite || emailChanged) && existing.inviteStatus !== MemberInviteStatus.ACTIVE) {
    const inviteResult = await issueMemberInvite(id!, staff.gymId);
    if ("error" in inviteResult) {
      return c.json({ error: { code: "INVITE_FAILED", message: inviteResult.error } }, 422);
    }
  }

  return c.json({ data: { ok: true } });
});

membersRoutes.delete("/:id", requireAdmin, async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  await prisma.member.deleteMany({ where: { id, gymId: staff.gymId } });
  return c.json({ data: { ok: true } });
});

membersRoutes.post("/:id/renew", requireDeskAccess, async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  const { months } = await c.req.json();
  if (![1, 3, 6, 12].includes(months)) {
    return c.json({ error: { code: "VALIDATION", message: "Durée invalide" } }, 422);
  }

  const member = await prisma.member.findFirst({
    where: { id, gymId: staff.gymId },
    select: { subscriptionEnd: true, status: true },
  });
  if (!member) {
    return c.json({ error: { code: "NOT_FOUND", message: "Membre introuvable" } }, 404);
  }

  const subscriptionEnd = extendSubscription(member.subscriptionEnd, months);
  await prisma.member.update({
    where: { id },
    data: {
      subscriptionEnd,
      status: resolveMemberStatusOnSubscriptionChange(member.status, subscriptionEnd),
    },
  });

  return c.json({ data: { subscriptionEnd: subscriptionEnd.toISOString() } });
});

membersRoutes.post("/:id/freeze", requireAdmin, async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = freezeMemberSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Données invalides" } }, 422);
  }

  const { freezeMember } = await import("../services/freeze");
  const result = await freezeMember(staff.gymId, id!, parsed.data.until);
  if ("error" in result) {
    const status = result.error === "Membre introuvable" ? 404 : 422;
    return c.json({ error: { code: "FREEZE_FAILED", message: result.error } }, status);
  }
  return c.json({ data: { ok: true } });
});

membersRoutes.post("/:id/unfreeze", requireAdmin, async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  const { unfreezeMember } = await import("../services/freeze");
  const result = await unfreezeMember(staff.gymId, id!);
  if ("error" in result) {
    const status = result.error === "Membre introuvable" ? 404 : 422;
    return c.json({ error: { code: "UNFREEZE_FAILED", message: result.error } }, status);
  }
  return c.json({ data: { subscriptionEnd: result.subscriptionEnd, extendedDays: result.extendedDays } });
});

membersRoutes.get("/:id/qr", requireDeskAccess, async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  const member = await prisma.member.findFirst({
    where: { id, gymId: staff.gymId },
    select: { id: true, fullName: true },
  });
  if (!member) {
    return c.json({ error: { code: "NOT_FOUND", message: "Membre introuvable" } }, 404);
  }
  return c.json({ data: { qrData: generateMemberQrPayload(member.id), memberName: member.fullName } });
});

membersRoutes.post("/:id/invite/resend", requireDeskAccess, async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  const result = await issueMemberInvite(id!, staff.gymId);
  if ("error" in result) {
    return c.json({ error: { code: "INVITE_FAILED", message: result.error } }, 422);
  }
  return c.json({ data: { ok: true } });
});

membersRoutes.post("/:id/invite/disable", requireAdmin, async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  await prisma.member.update({
    where: { id, gymId: staff.gymId },
    data: {
      inviteStatus: MemberInviteStatus.DISABLED,
      inviteToken: null,
      inviteExpiresAt: null,
    },
  });
  return c.json({ data: { ok: true } });
});

membersRoutes.get("/:id/payments", requireDeskAccess, async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  const { listMemberPayments } = await import("../services/payments");
  const payments = await listMemberPayments(staff.gymId, id!);
  if (payments === null) {
    return c.json({ error: { code: "NOT_FOUND", message: "Membre introuvable" } }, 404);
  }
  return c.json({ data: payments });
});

membersRoutes.post("/:id/payments", requireDeskAccess, async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Données invalides" } }, 422);
  }

  const { createPayment } = await import("../services/payments");
  const payment = await createPayment(staff.gymId, id!, staff.sub, parsed.data);
  if (!payment) {
    return c.json({ error: { code: "NOT_FOUND", message: "Membre introuvable" } }, 404);
  }
  return c.json({ data: payment }, 201);
});

export const paymentsRoutes = new Hono();
paymentsRoutes.use("*", requireAdmin);

paymentsRoutes.get("/", async (c) => {
  const staff = c.get("staff");
  const { listPayments } = await import("../services/payments");
  const from = c.req.query("from") ?? undefined;
  const to = c.req.query("to") ?? undefined;
  const method = c.req.query("method") ?? undefined;
  const payments = await listPayments(staff.gymId, {
    from,
    to,
    method: method as import("@prisma/client").PaymentMethod | undefined,
  });
  return c.json({ data: payments });
});

paymentsRoutes.get("/export", async (c) => {
  const staff = c.get("staff");
  try {
    await assertGymFeature(staff.gymId, "csv_export");
  } catch (error) {
    if (isFeatureLockedError(error)) {
      return featureLockedResponse(c);
    }
    throw error;
  }

  const { listPayments } = await import("../services/payments");
  const { format } = await import("date-fns");
  const from = c.req.query("from") ?? undefined;
  const to = c.req.query("to") ?? undefined;
  const method = c.req.query("method") ?? undefined;

  const payments = await listPayments(staff.gymId, {
    from,
    to,
    method: method as import("@prisma/client").PaymentMethod | undefined,
  });

  const methodLabels: Record<string, string> = {
    CASH: "Espèces",
    D17: "D17",
    BANK_TRANSFER: "Virement bancaire",
    CARD: "Carte bancaire",
    OTHER: "Autre",
  };

  function csvCell(value: string | number) {
    const str = String(value ?? "");
    if (/[",\n;]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const header = ["Date", "Membre", "Montant", "Mode", "Note", "Enregistré par"];
  const rows = payments.map((payment) =>
    [
      format(payment.paidAt, "yyyy-MM-dd"),
      payment.member.fullName,
      Number(payment.amount).toFixed(2),
      methodLabels[payment.method] ?? payment.method,
      payment.note ?? "",
      payment.recordedBy.name,
    ]
      .map(csvCell)
      .join(","),
  );

  const csv = "\uFEFF" + [header.join(","), ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paiements-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
});

export const accessRoutes = new Hono();

accessRoutes.get("/export", requireAdmin, async (c) => {
  const staff = c.get("staff");
  try {
    await assertGymFeature(staff.gymId, "access_export");
  } catch (error) {
    if (isFeatureLockedError(error)) {
      return featureLockedResponse(c);
    }
    throw error;
  }

  const members = await prisma.member.findMany({
    where: { gymId: staff.gymId, badgeNumber: { not: null } },
    select: {
      fullName: true,
      phone: true,
      badgeNumber: true,
      status: true,
      subscriptionEnd: true,
      frozenAt: true,
    },
    orderBy: { fullName: "asc" },
  });

  const csv = buildAccessExportCsv(members);
  await prisma.gym.update({
    where: { id: staff.gymId },
    data: { lastAccessExportAt: new Date() },
  });

  return c.text(csv, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="access-allowed.csv"',
  });
});

export const deskRoutes = new Hono();
deskRoutes.get("/today", requireDeskAccess, async (c) => {
  const { getDeskTodayData } = await import("../services/desk");
  const data = await getDeskTodayData(c.get("staff").gymId);
  return c.json({ data });
});

export const dashboardRoutes = new Hono();
dashboardRoutes.get("/", requireAdmin, async (c) => {
  const { getDashboardData } = await import("../services/dashboard");
  const data = await getDashboardData(c.get("staff").gymId);
  return c.json({ data });
});

export const attendanceRoutes = new Hono();
attendanceRoutes.get("/", requireAdmin, async (c) => {
  const { getAttendanceData } = await import("../services/attendance");
  const data = await getAttendanceData(c.get("staff").gymId);
  return c.json({ data });
});

export const staffRoutes = new Hono();
staffRoutes.use("*", requireAdmin);

staffRoutes.get("/", async (c) => {
  const staff = c.get("staff");
  const users = await prisma.user.findMany({
    where: { gymId: staff.gymId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return c.json({ data: users });
});

staffRoutes.post("/", async (c) => {
  const session = c.get("staff");
  const body = await c.req.json();
  const parsed = staffSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Données invalides" } }, 422);
  }

  const gym = await prisma.gym.findUniqueOrThrow({
    where: { id: session.gymId },
    select: { maxStaff: true },
  });
  const count = await prisma.user.count({ where: { gymId: session.gymId } });
  if (!canAddStaff(count, gym.maxStaff)) {
    return c.json({ error: { code: "STAFF_LIMIT", message: "STAFF_LIMIT" } }, 403);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    const user = await prisma.user.create({
      data: {
        gymId: session.gymId,
        name: parsed.data.name.trim(),
        email: parsed.data.email.toLowerCase().trim(),
        passwordHash,
        role: parsed.data.role as Role,
      },
      select: { id: true, name: true, email: true, role: true },
    });
    return c.json({ data: user }, 201);
  } catch {
    return c.json({ error: { code: "CONFLICT", message: "staff.emailExists" } }, 409);
  }
});

staffRoutes.delete("/:id", async (c) => {
  const session = c.get("staff");
  const id = c.req.param("id");
  if (id === session.sub) {
    return c.json({ error: { code: "FORBIDDEN", message: "Impossible de supprimer votre propre compte" } }, 403);
  }
  await prisma.user.deleteMany({ where: { id, gymId: session.gymId } });
  return c.json({ data: { ok: true } });
});

export const settingsRoutes = new Hono();

settingsRoutes.get("/", requireDeskAccess, async (c) => {
  const gym = await prisma.gym.findUnique({
    where: { id: c.get("staff").gymId },
    select: {
      plan: true,
      accessMode: true,
      planStatus: true,
      maxStaff: true,
      cardTheme: true,
      onboardingCompletedAt: true,
      name: true,
      location: true,
    },
  });
  if (!gym) {
    return c.json({ error: { code: "NOT_FOUND", message: "Salle introuvable" } }, 404);
  }
  const limits = getPlanLimits(gym.plan);
  return c.json({
    data: {
      plan: gym.plan,
      accessMode: gym.accessMode,
      planStatus: gym.planStatus,
      maxStaff: gym.maxStaff,
      features: limits.features,
      cardTheme: gym.cardTheme ?? "default",
      onboardingCompletedAt: gym.onboardingCompletedAt,
      name: gym.name,
      location: gym.location,
    },
  });
});

settingsRoutes.get("/gym", requireAdmin, async (c) => {
  const gym = await prisma.gym.findUnique({ where: { id: c.get("staff").gymId } });
  if (!gym) {
    return c.json({ error: { code: "NOT_FOUND", message: "Salle introuvable" } }, 404);
  }
  return c.json({ data: gym });
});

settingsRoutes.patch("/plan-access", requireAdmin, async (c) => {
  const staff = c.get("staff");
  const body = await c.req.json<{ plan?: unknown; accessMode?: unknown }>();
  const plan = body.plan;
  const modeRaw = body.accessMode;
  if (!isPlan(plan)) {
    return c.json({ error: { code: "VALIDATION", message: "settings.invalidPlan" } }, 422);
  }
  if (!isAccessMode(modeRaw)) {
    return c.json({ error: { code: "VALIDATION", message: "settings.invalidAccessMode" } }, 422);
  }
  const maxStaff = getPlanLimits(plan).maxStaff;
  const allowed = modesAllowedForPlan(plan);
  const accessMode = allowed.includes(modeRaw) ? modeRaw : AccessMode.DESK_ONLY;

  const gym = await prisma.gym.update({
    where: { id: staff.gymId },
    data: { plan, maxStaff, accessMode },
  });
  return c.json({
    data: { plan: gym.plan, accessMode: gym.accessMode, maxStaff: gym.maxStaff },
  });
});

settingsRoutes.patch("/gym", requireAdmin, async (c) => {
  const staff = c.get("staff");
  const body = await c.req.json();
  const parsed = gymSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Données invalides" } }, 422);
  }

  const gym = await prisma.gym.update({
    where: { id: staff.gymId },
    data: {
      name: parsed.data.name.trim(),
      location: parsed.data.location?.trim() || null,
      cardTheme: parsed.data.cardTheme ?? null,
    },
  });
  return c.json({ data: gym });
});

settingsRoutes.patch("/password", requireStaff, async (c) => {
  const staff = c.get("staff");
  const body = await c.req.json();
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "Données invalides" } }, 422);
  }

  const user = await prisma.user.findUnique({ where: { id: staff.sub } });
  if (!user) {
    return c.json({ error: { code: "NOT_FOUND", message: "Utilisateur introuvable" } }, 404);
  }

  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return c.json({ error: { code: "INVALID_PASSWORD", message: "settings.wrongPassword" } }, 422);
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return c.json({ data: { ok: true } });
});

export const memberAppRoutes = new Hono();
memberAppRoutes.use("*", requireMember);

memberAppRoutes.get("/wallet", async (c) => {
  const session = c.get("member");
  const member = await prisma.member.findFirst({
    where: { id: session.sub, gymId: session.gymId },
    include: { gym: { select: { name: true, cardTheme: true } } },
  });
  if (!member) {
    return c.json({ error: { code: "NOT_FOUND", message: "Membre introuvable" } }, 404);
  }
  const status = getMemberStatus(member.subscriptionEnd);
  return c.json({
    data: {
      id: member.id,
      fullName: member.fullName,
      gymName: member.gym.name,
      cardTheme: member.gym.cardTheme ?? "default",
      subscriptionEnd: member.subscriptionEnd.toISOString(),
      status,
      isActive: status === MemberStatus.ACTIVE,
    },
  });
});

memberAppRoutes.get("/qr", async (c) => {
  const session = c.get("member");
  const member = await prisma.member.findFirst({
    where: { id: session.sub, gymId: session.gymId },
    select: { id: true, subscriptionEnd: true },
  });
  if (!member) {
    return c.json({ error: { code: "NOT_FOUND", message: "Membre introuvable" } }, 404);
  }
  return c.json({
    data: {
      qrData: generateMemberQrPayload(member.id),
      isActive: getMemberStatus(member.subscriptionEnd) === MemberStatus.ACTIVE,
    },
  });
});

export const metaRoutes = new Hono();

metaRoutes.get("/health", (c) => c.json({ data: { status: "ok" } }));

metaRoutes.get("/legal/privacy", (c) =>
  c.json({
    data: {
      title: "Politique de confidentialité",
      url: `${process.env.API_PUBLIC_URL ?? ""}/legal/privacy`,
      lastUpdated: "2026-06-29",
    },
  }),
);

metaRoutes.patch("/preferences/locale", requireStaff, async (c) => {
  const { locale } = await c.req.json();
  if (locale !== "fr" && locale !== "ar") {
    return c.json({ error: { code: "VALIDATION", message: "Locale invalide" } }, 422);
  }
  return c.json({ data: { locale } });
});

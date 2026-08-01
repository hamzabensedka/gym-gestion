import {
  PrismaClient,
  Role,
  MemberStatus,
  MemberInviteStatus,
  PaymentMethod,
  Plan,
  AccessMode,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, setHours, setMinutes, subMonths } from "date-fns";

const prisma = new PrismaClient();

const now = new Date();
const memberPasswordHashPromise = bcrypt.hash("member123", 10);

const memberSeed: Array<{
  fullName: string;
  phone: string;
  startOffset: number;
  endOffset: number;
  fee: number;
  notes?: string;
}> = [
  { fullName: "Ahmed Ben Ali", phone: "+21620123456", startOffset: -10, endOffset: 20, fee: 80, notes: "Abonnement 1 mois" },
  { fullName: "Sara Trabelsi", phone: "+21622111222", startOffset: -40, endOffset: -5, fee: 120, notes: "Renouvellement en attente" },
  { fullName: "Youssef Gharbi", phone: "+21698765432", startOffset: -5, endOffset: 3, fee: 100 },
  { fullName: "Mariem Bouazizi", phone: "+21655443322", startOffset: -60, endOffset: 30, fee: 150, notes: "Coaching personnel" },
  { fullName: "Khalil Mansour", phone: "+21621987654", startOffset: -90, endOffset: 90, fee: 70, notes: "Abonnement annuel" },
  { fullName: "Ines Jlassi", phone: "+21629334455", startOffset: -15, endOffset: 15, fee: 90 },
  { fullName: "Hamza Khelifi", phone: "+21652778899", startOffset: -120, endOffset: -20, fee: 80, notes: "Inactif" },
  { fullName: "Nour Belhaj", phone: "+21624556677", startOffset: -7, endOffset: 23, fee: 110 },
  { fullName: "Oussama Riahi", phone: "+21627889900", startOffset: -45, endOffset: 6, fee: 95 },
  { fullName: "Rania Saidi", phone: "+21653221144", startOffset: -3, endOffset: 60, fee: 130, notes: "Abonnement 3 mois" },
  { fullName: "Bilel Hammami", phone: "+21625667788", startOffset: -200, endOffset: -60, fee: 80 },
  { fullName: "Fatma Zouari", phone: "+21698112233", startOffset: -2, endOffset: 28, fee: 100 },
  { fullName: "Slim Karoui", phone: "+21622990011", startOffset: -30, endOffset: 1, fee: 85, notes: "Expire demain" },
  { fullName: "Emna Chedly", phone: "+21629445566", startOffset: -20, endOffset: 40, fee: 120 },
];

function statusFor(endOffset: number): MemberStatus {
  return endOffset >= 0 ? MemberStatus.ACTIVE : MemberStatus.EXPIRED;
}

async function main() {
  await prisma.checkin.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.member.deleteMany();
  await prisma.user.deleteMany();
  await prisma.gym.deleteMany();

  const gym = await prisma.gym.create({
    data: {
      name: "FitBox Mahdia",
      location: "Mahdia, Tunisie",
      cardTheme: "fitbox-mahdia",
      plan: Plan.PRO,
      accessMode: AccessMode.BADGE_PC_EXTENSION,
      maxStaff: 10,
      onboardingCompletedAt: new Date(),
    },
  });

  const adminPassword = await bcrypt.hash("admin123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  await prisma.user.createMany({
    data: [
      {
        gymId: gym.id,
        name: "Propriétaire",
        email: "admin@gym.local",
        passwordHash: adminPassword,
        role: Role.ADMIN,
      },
      {
        gymId: gym.id,
        name: "Réception",
        email: "staff@gym.local",
        passwordHash: staffPassword,
        role: Role.STAFF,
      },
    ],
  });

  const adminUser = await prisma.user.findFirst({
    where: { gymId: gym.id, email: "admin@gym.local" },
    select: { id: true },
  });
  if (!adminUser) throw new Error("Admin user missing after seed");

  const memberPasswordHash = await memberPasswordHashPromise;

  const createdMembers = [];
  for (const [index, m] of memberSeed.entries()) {
    const slug = m.fullName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "");
    const created = await prisma.member.create({
      data: {
        gymId: gym.id,
        fullName: m.fullName,
        phone: m.phone,
        email: `${slug}.${index + 1}@member.gym.local`,
        passwordHash: memberPasswordHash,
        inviteStatus: MemberInviteStatus.ACTIVE,
        emailVerifiedAt: now,
        subscriptionStart: subDays(now, Math.abs(m.startOffset)),
        subscriptionEnd: addDays(now, m.endOffset),
        status: statusFor(m.endOffset),
        monthlyFee: m.fee,
        notes: m.notes ?? null,
      },
    });
    createdMembers.push({ id: created.id, endOffset: m.endOffset, index: createdMembers.length, fee: m.fee });
  }

  // Freeze a couple of members for demo.
  const frozenTargets = createdMembers.filter((m) => m.endOffset >= 0).slice(0, 2);
  for (const target of frozenTargets) {
    await prisma.member.update({
      where: { id: target.id },
      data: {
        status: MemberStatus.FROZEN,
        frozenAt: subDays(now, 3),
        frozenUntil: addDays(now, 10),
      },
    });
  }

  // Generate check-ins over the last 7 days for active members.
  const activeMembers = createdMembers.filter((m) => m.endOffset >= 0);
  const checkinData: Array<{ memberId: string; gymId: string; timestamp: Date }> = [];

  for (let dayBack = 6; dayBack >= 0; dayBack--) {
    const day = subDays(now, dayBack);
    // More visits on recent days, fewer on older.
    const visitorCount = Math.min(
      activeMembers.length,
      Math.round(3 + Math.random() * 5 + (6 - dayBack) * 0.5),
    );
    const shuffled = [...activeMembers].sort(() => Math.random() - 0.5);
    for (let i = 0; i < visitorCount; i++) {
      const member = shuffled[i];
      const hour = 7 + Math.floor(Math.random() * 15);
      const minute = Math.floor(Math.random() * 60);
      let ts = setMinutes(setHours(day, hour), minute);
      if (dayBack === 0 && ts > now) ts = now;
      checkinData.push({ memberId: member.id, gymId: gym.id, timestamp: ts });
    }
  }

  // Make a couple of members clearly "most active".
  for (let i = 0; i < 4; i++) {
    const member = activeMembers[i % activeMembers.length];
    for (let j = 0; j < 3; j++) {
      checkinData.push({
        memberId: member.id,
        gymId: gym.id,
        timestamp: setHours(subDays(now, j + 1), 18),
      });
    }
  }

  await prisma.checkin.createMany({ data: checkinData });

  const paymentMembers = createdMembers.filter((m) => m.endOffset >= -30).slice(0, 8);
  const paymentData = paymentMembers.flatMap((member, index) => {
    const methods = [
      PaymentMethod.CASH,
      PaymentMethod.D17,
      PaymentMethod.BANK_TRANSFER,
      PaymentMethod.CARD,
    ] as const;
    const rows = [
      {
        gymId: gym.id,
        memberId: member.id,
        recordedById: adminUser.id,
        amount: member.fee,
        method: methods[index % methods.length],
        paidAt: subDays(now, 5 + index * 2),
        note: index % 3 === 0 ? "Abonnement mensuel" : null,
      },
    ];
    if (member.endOffset < 0) {
      rows.push({
        gymId: gym.id,
        memberId: member.id,
        recordedById: adminUser.id,
        amount: Math.round(member.fee * 0.5),
        method: PaymentMethod.CASH,
        paidAt: subMonths(now, 2),
        note: "Ancien paiement",
      });
    }
    return rows;
  });

  await prisma.payment.createMany({ data: paymentData });

  console.log(
    `Seeded gym "${gym.name}" with ${createdMembers.length} members, ${checkinData.length} check-ins, and ${paymentData.length} payments`,
  );
  console.log("Admin: admin@gym.local / admin123");
  console.log("Staff: staff@gym.local / staff123");
  console.log("Demo member login: ahmed.ben.ali.1@member.gym.local / member123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

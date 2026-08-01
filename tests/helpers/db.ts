import { execSync } from "node:child_process";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(__dirname, "../..");

function loadTestEnv() {
  loadEnv({ path: path.join(root, ".env.test"), override: true });
  loadEnv({ path: path.join(root, ".env") });
}

export function getTestEnv() {
  loadTestEnv();
  return { ...process.env };
}

export function resetTestDatabase() {
  const env = getTestEnv();

  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy env.test.example to .env.test and point it at a dedicated test database.",
    );
  }

  if (!env.DATABASE_URL.includes("_test") && !env.DATABASE_URL.includes("gym_gestion_test")) {
    throw new Error(
      "Refusing to reset database: DATABASE_URL must point to a dedicated test database (e.g. gym_gestion_test).",
    );
  }

  execSync("npx prisma db push --accept-data-loss", {
    cwd: root,
    env,
    stdio: "inherit",
  });

  // Seed script deletes all rows before inserting fixtures.
  execSync("npm run db:seed", {
    cwd: root,
    env,
    stdio: "inherit",
  });
}

export async function getPrisma() {
  loadTestEnv();
  return new PrismaClient();
}

export async function findGymId() {
  const prisma = await getPrisma();
  try {
    const gym = await prisma.gym.findFirst({ select: { id: true } });
    if (!gym) throw new Error("No gym found after seed");
    return gym.id;
  } finally {
    await prisma.$disconnect();
  }
}

export async function getMemberInviteToken(email: string) {
  const prisma = await getPrisma();
  try {
    const member = await prisma.member.findFirst({
      where: { email: email.toLowerCase() },
      select: { inviteToken: true },
    });
    return member?.inviteToken ?? null;
  } finally {
    await prisma.$disconnect();
  }
}

export async function getMemberIdByName(fullName: string) {
  const prisma = await getPrisma();
  try {
    const member = await prisma.member.findFirst({
      where: { fullName },
      select: { id: true },
    });
    return member?.id ?? null;
  } finally {
    await prisma.$disconnect();
  }
}

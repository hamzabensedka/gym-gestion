"use server";

import { revalidatePath } from "next/cache";
import {
  bookSession,
  cancelBooking,
  isBookingError,
  type BookingErrorCode,
} from "@/lib/class-booking";
import { prisma } from "@/lib/db";
import { assertFeature } from "@/lib/gym-features";
import { requireMemberSession } from "@/lib/member-session";

type ActionResult = { ok: true } | { error: BookingErrorCode };

async function requireMemberClasses() {
  const session = await requireMemberSession();
  try {
    await assertFeature(session.gymId, "class_booking");
  } catch (error) {
    if (error instanceof Error && error.message === "FEATURE_LOCKED") {
      return { error: "FEATURE_LOCKED" as const, session: null };
    }
    throw error;
  }
  return { error: null, session };
}

function revalidateMemberClasses() {
  revalidatePath("/member/classes");
}

export async function memberBookAction(
  sessionId: string,
): Promise<ActionResult> {
  if (!sessionId) return { error: "VALIDATION" };
  const gate = await requireMemberClasses();
  if (gate.error || !gate.session) {
    return { error: gate.error ?? "FEATURE_LOCKED" };
  }
  try {
    await bookSession(prisma, {
      gymId: gate.session.gymId,
      memberId: gate.session.memberId,
      sessionId,
      now: new Date(),
    });
  } catch (error) {
    if (isBookingError(error)) {
      return { error: error.code };
    }
    throw error;
  }
  revalidateMemberClasses();
  return { ok: true };
}

export async function memberCancelAction(
  sessionId: string,
): Promise<ActionResult> {
  if (!sessionId) return { error: "VALIDATION" };
  const gate = await requireMemberClasses();
  if (gate.error || !gate.session) {
    return { error: gate.error ?? "FEATURE_LOCKED" };
  }
  try {
    await cancelBooking(prisma, {
      gymId: gate.session.gymId,
      memberId: gate.session.memberId,
      sessionId,
      now: new Date(),
      actor: "member",
    });
  } catch (error) {
    if (isBookingError(error)) {
      return { error: error.code };
    }
    throw error;
  }
  revalidateMemberClasses();
  return { ok: true };
}

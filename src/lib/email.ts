import { Resend } from "resend";
import {
  buildMemberInviteEmailHtml,
  buildMobileInviteUrl,
  buildWebInviteUrl,
} from "@gym/shared/member-auth";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

function getFromAddress() {
  return process.env.EMAIL_FROM ?? "FitBox <noreply@fitbox.local>";
}

export type SentInviteEmail = {
  to: string;
  gymName: string;
  token: string;
  inviteUrl: string;
};

let lastDevInviteEmail: SentInviteEmail | null = null;

export function getLastDevInviteEmail(): SentInviteEmail | null {
  return lastDevInviteEmail;
}

export function clearLastDevInviteEmail() {
  lastDevInviteEmail = null;
}

export async function sendMemberInviteEmail({
  to,
  gymName,
  token,
}: {
  to: string;
  gymName: string;
  token: string;
}) {
  const webInviteUrl = buildWebInviteUrl(getAppUrl(), token);
  const mobileInviteUrl = buildMobileInviteUrl(
    token,
    process.env.MOBILE_APP_SCHEME ?? "gymgestion",
  );
  const subject = `Activez votre carte membre — ${gymName}`;
  const html = buildMemberInviteEmailHtml({ gymName, webInviteUrl, mobileInviteUrl });

  if (!resend) {
    lastDevInviteEmail = { to, gymName, token, inviteUrl: webInviteUrl };
    console.info("[email:dev] Member invite", { to, webInviteUrl, mobileInviteUrl });
    return { ok: true as const, dev: true };
  }

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[email] Failed to send invite:", error);
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

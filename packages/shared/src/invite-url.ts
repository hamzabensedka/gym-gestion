const SCHEME_SUFFIX = /:\/\/+$/;

/** Strip accidental `://` suffix from env vars like `gymgestion://`. */
export function normalizeAppScheme(raw: string): string {
  return raw.trim().replace(SCHEME_SUFFIX, "").replace(/\/+$/, "");
}

export function buildMobileInviteUrl(
  token: string,
  scheme = "gymgestion",
): string {
  return `${normalizeAppScheme(scheme)}://invite/${token}`;
}

export function buildWebInviteUrl(appUrl: string, token: string): string {
  const base = appUrl.trim().replace(/\/+$/, "");
  return `${base}/member/invite/${token}`;
}

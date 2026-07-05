import type { Context, Next } from "hono";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxPerMinute: number, keyFn: (c: Context) => string) {
  return async (c: Context, next: Next) => {
    const key = keyFn(c);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + 60_000 });
      await next();
      return;
    }

    if (bucket.count >= maxPerMinute) {
      return c.json(
        { error: { code: "RATE_LIMITED", message: "Trop de tentatives, réessayez plus tard" } },
        429,
      );
    }

    bucket.count += 1;
    await next();
  };
}

export const loginRateLimit = rateLimit(10, (c) => {
  const forwarded = c.req.header("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
});

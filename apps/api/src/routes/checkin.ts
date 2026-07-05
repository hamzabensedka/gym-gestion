import { Hono } from "hono";
import { performCheckin, parseMemberIdFromQr } from "../services/checkin";
import { requireCheckinAccess } from "../middleware/auth";

export const checkinRoutes = new Hono();

checkinRoutes.use("*", requireCheckinAccess);

checkinRoutes.post("/", async (c) => {
  const staff = c.get("staff");
  const body = await c.req.json();
  const memberId = body.memberId ?? parseMemberIdFromQr(body.qrData ?? "");

  if (!memberId) {
    return c.json({ data: { success: false, outcome: "INVALID" } }, 400);
  }

  const result = await performCheckin(staff.gymId, memberId);
  return c.json({ data: result });
});

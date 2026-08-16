import { Hono } from "hono";
import { performCheckinFromInput } from "../services/checkin";
import { requireCheckinAccess } from "../middleware/auth";

export const checkinRoutes = new Hono();

checkinRoutes.use("*", requireCheckinAccess);

checkinRoutes.post("/", async (c) => {
  const staff = c.get("staff");
  const body = (await c.req.json()) as {
    memberId?: string;
    qrData?: string;
    code?: string;
  };
  const result = await performCheckinFromInput(staff.gymId, body);

  if (result.outcome === "INVALID") {
    return c.json({ data: { success: false, outcome: "INVALID" } }, 400);
  }

  return c.json({ data: result });
});

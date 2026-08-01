import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth";
import { checkinRoutes } from "./routes/checkin";
import {
  membersRoutes,
  dashboardRoutes,
  attendanceRoutes,
  staffRoutes,
  settingsRoutes,
  memberAppRoutes,
  metaRoutes,
  paymentsRoutes,
  deskRoutes,
} from "./routes/app";
import { billsRoutes } from "./routes/bills";
import { drinksRoutes } from "./routes/drinks";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (process.env.CORS_ORIGINS ?? "*").split(",").map((s) => s.trim()),
    allowHeaders: ["Authorization", "Content-Type"],
  }),
);

app.route("/v1/auth", authRoutes);
app.route("/v1/checkin", checkinRoutes);
app.route("/v1/members", membersRoutes);
app.route("/v1/payments", paymentsRoutes);
app.route("/v1/bills", billsRoutes);
app.route("/v1/drinks", drinksRoutes);
app.route("/v1/desk", deskRoutes);
app.route("/v1/dashboard", dashboardRoutes);
app.route("/v1/attendance", attendanceRoutes);
app.route("/v1/staff", staffRoutes);
app.route("/v1/settings", settingsRoutes);
app.route("/v1/member", memberAppRoutes);
app.route("/v1", metaRoutes);

app.notFound((c) =>
  c.json({ error: { code: "NOT_FOUND", message: "Route introuvable" } }, 404),
);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: { code: "INTERNAL", message: "Erreur serveur" } }, 500);
});

const port = Number(process.env.PORT ?? 4000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Gym Gestion API listening on http://localhost:${port}/v1`);
});

export default app;

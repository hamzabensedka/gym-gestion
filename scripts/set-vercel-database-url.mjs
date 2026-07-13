import { execSync } from "node:child_process";

const pooled = execSync(
  "npx neonctl connection-string --project-id delicate-night-44453919 --org-id org-shy-fog-29799324 --pooled",
  { encoding: "utf8" },
).trim();

let url = pooled;
if (!url.includes("?")) url += "?sslmode=require";
else if (!url.includes("sslmode=")) url += "&sslmode=require";
if (!url.includes("connect_timeout=")) url += "&connect_timeout=15";
if (!url.includes("connection_limit=")) url += "&connection_limit=1";

try {
  execSync("npx vercel env rm DATABASE_URL production --yes", { stdio: "inherit" });
} catch {
  // variable may not exist yet
}

execSync(
  `npx vercel env add DATABASE_URL production --value ${JSON.stringify(url)} --yes`,
  { stdio: "inherit", shell: true },
);

console.log("saved host contains pooler:", url.includes("pooler"));

import fs from "fs";
import path from "path";

const root =
  "C:/Users/LENOVO/.cursor/projects/c-Users-LENOVO-workspace-GYM-GESTION/agent-transcripts";

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}

for (const file of walk(root)) {
  const txt = fs.readFileSync(file, "utf8");
  if (!txt.includes("src\\\\lib\\\\i18n.ts") && !txt.includes("src/lib/i18n.ts")) continue;
  const markers = [
    "export const locales",
    "export type Locale",
    "const fr =",
    "createTranslator",
  ];
  for (const marker of markers) {
    const idx = txt.indexOf(marker);
    if (idx === -1) continue;
    console.log("FILE:", file);
    console.log("MARKER:", marker);
    console.log(txt.slice(Math.max(0, idx - 100), idx + 15000));
    process.exit(0);
  }
}

console.log("not found");

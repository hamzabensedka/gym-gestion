import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public/icons/icon.svg");
const svg = readFileSync(svgPath, "utf8");

async function main() {
  const sharp = (await import("sharp")).default;
  const sizes = [192, 512];

  for (const size of sizes) {
    const out = join(root, `public/icons/icon-${size}.png`);
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
    console.log(`Generated ${out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

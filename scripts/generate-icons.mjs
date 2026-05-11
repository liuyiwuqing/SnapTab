import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "public/icons/logo-mark.svg");
const outputDir = path.join(root, "public/icons");
const sizes = [16, 32, 48, 128, 256, 512];

async function main() {
  await fs.access(source);
  await Promise.all(
    sizes.map(async (size) => {
      const output = path.join(outputDir, `icon-${size}.png`);
      await sharp(source).resize(size, size).png().toFile(output);
    })
  );
  console.log(`Generated icon PNG files: ${sizes.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outputDir = path.join(root, "public/store-assets");
const logoPath = path.join(root, "public/icons/logo-mark.svg");

function cardSvg({ width, height, title, subtitle }) {
  const escapedTitle = escapeXml(title);
  const escapedSubtitle = escapeXml(subtitle);
  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0E4FD6"/>
        <stop offset="100%" stop-color="#2F88FF"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <rect x="${Math.round(width * 0.06)}" y="${Math.round(height * 0.16)}" width="${Math.round(width * 0.88)}" height="${Math.round(height * 0.68)}" rx="24" fill="rgba(255,255,255,0.12)"/>
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.46)}" font-size="${Math.round(height * 0.12)}" font-weight="700" fill="#ffffff" font-family="Inter, Arial, sans-serif">${escapedTitle}</text>
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.58)}" font-size="${Math.round(height * 0.055)}" font-weight="500" fill="#dbeafe" font-family="Inter, Arial, sans-serif">${escapedSubtitle}</text>
  </svg>
  `;
}

function escapeXml(input) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function renderAsset(filename, width, height, title, subtitle) {
  const canvas = sharp(Buffer.from(cardSvg({ width, height, title, subtitle })));
  const logo = await sharp(logoPath).resize(Math.round(height * 0.36), Math.round(height * 0.36)).png().toBuffer();
  await canvas
    .composite([
      {
        input: logo,
        left: Math.round(width * 0.78),
        top: Math.round(height * 0.12)
      }
    ])
    .png()
    .toFile(path.join(outputDir, filename));
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  await renderAsset("small-tile-440x280.png", 440, 280, "SnapTab", "Capture. Edit. Frame. Share.");
  await renderAsset("marquee-1400x560.png", 1400, 560, "SnapTab", "Chrome Screenshot Toolkit");

  await renderAsset("screenshot-1-capture-1280x800.png", 1280, 800, "Capture Modes", "Full page · Region · Tab · Element");
  await renderAsset("screenshot-2-editor-1280x800.png", 1280, 800, "Built-in Editor", "Crop · Annotate · Add Text");
  await renderAsset("screenshot-3-frames-1280x800.png", 1280, 800, "Frame Templates", "12 built-in styles + custom upload");
  await renderAsset("screenshot-4-share-1280x800.png", 1280, 800, "Export & Share", "PNG/JPG · Clipboard · Web Share");

  console.log(`Generated store assets in ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const distDir = path.join(root, "dist");
const releaseDir = path.join(root, "release");

async function readVersion() {
  const raw = await fs.readFile(path.join(root, "package.json"), "utf-8");
  const pkg = JSON.parse(raw);
  return pkg.version || "0.0.0";
}

async function main() {
  await fs.access(distDir);
  await fs.mkdir(releaseDir, { recursive: true });
  const version = await readVersion();
  const outputZip = path.join(releaseDir, `snaptab-v${version}.zip`);
  await fs.rm(outputZip, { force: true });

  const result = spawnSync("zip", ["-r", outputZip, "."], {
    cwd: distDir,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error("zip command failed. Ensure zip is installed.");
  }

  console.log(`Created package: ${outputZip}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

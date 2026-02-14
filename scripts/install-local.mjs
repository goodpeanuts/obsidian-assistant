import fs from "node:fs/promises";
import path from "node:path";

const pluginId = "obsidian-assistant";
const sourceDir = path.join(".build", pluginId);
const vaultPath = process.env.OBSIDIAN_VAULT;

if (!vaultPath) {
  console.error("Missing OBSIDIAN_VAULT env var.");
  console.error("Example:");
  console.error("  OBSIDIAN_VAULT=\"D:\\\\MyVault\" npm run install:local");
  process.exit(1);
}

const targetDir = path.join(vaultPath, ".obsidian", "plugins", pluginId);
await fs.mkdir(targetDir, { recursive: true });

for (const file of ["main.js", "manifest.json", "styles.css"]) {
  await fs.copyFile(path.join(sourceDir, file), path.join(targetDir, file));
}

console.log(`Installed plugin to: ${targetDir}`);

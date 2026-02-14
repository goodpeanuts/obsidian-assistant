import fs from "node:fs/promises";
import path from "node:path";

const pluginId = "obsidian-assistant";
const outDir = path.join(".build", pluginId);
const requiredFiles = ["main.js", "manifest.json", "styles.css"];

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

for (const file of requiredFiles) {
  await fs.copyFile(file, path.join(outDir, file));
}

console.log(`Local plugin build created at: ${outDir}`);

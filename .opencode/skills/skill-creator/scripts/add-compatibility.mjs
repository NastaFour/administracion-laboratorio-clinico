#!/usr/bin/env node
/**
 * add-compatibility.mjs — adds `compatibility` to SKILL.md files that don't have it
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CATALOG_ROOT = resolve(__dirname, "../../..");
const SKIP = new Set(["copia-de-seguridad", "copia-de-seguridad-2", "node_modules", ".git"]);

const COMPAT_DEFAULT = "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+.";

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) out.push(...walk(join(dir, e.name))); }
    else if (e.isFile() && e.name === "SKILL.md") out.push(join(dir, e.name));
  }
  return out;
}

let added = 0, skipped = 0;
for (const file of walk(CATALOG_ROOT)) {
  let content = readFileSync(file, "utf8");
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) { skipped++; continue; }
  const front = fm[1];
  if (front.match(/^compatibility:\s/m)) { skipped++; continue; }
  const lines = front.split("\n");
  // Insert compatibility after license or after description
  const licenseIdx = lines.findIndex(l => l.match(/^license:\s/));
  const descIdx = lines.findIndex(l => l.match(/^description:\s/));
  const insertAfter = licenseIdx !== -1 ? licenseIdx : descIdx;
  if (insertAfter === -1) { skipped++; continue; }
  lines.splice(insertAfter + 1, 0, `compatibility: "${COMPAT_DEFAULT}"`);
  const newFront = lines.join("\n");
  const body = content.slice(fm[0].length);
  writeFileSync(file, `---\n${newFront}\n---${body}`, "utf8");
  console.log(`  ✅ ${file.replace(CATALOG_ROOT + "\\", "").replace(/\//g, "\\")}`);
  added++;
}
console.log(`\n📊 ${added} compatibility added · ${skipped} already had compatibility`);

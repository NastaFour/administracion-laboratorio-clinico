#!/usr/bin/env node
/**
 * apply-guarded.mjs — One-shot migration script.
 *
 * Walks all .mjs scripts in the skills catalog and wraps every
 * `exitFromResult(result)` call with `exitFromResultGuarded(result)`.
 *
 * Also adds the `exitFromResultGuarded` import to scripts that already
 * import `exitFromResult` from `_shared/script-utils.mjs`.
 *
 * Idempotent — running twice is a no-op.
 * Excludes _shared/ itself and frontend-design/.
 *
 * Usage:
 *   node _shared/apply-guarded.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const skillsRoot = resolve(__dirname, "..");
const sharedDir = __dirname.replace(/[\\/]+$/, "");

const EXCLUDE_DIRS = new Set(["node_modules", ".git", "dist", "build", "copia-de-seguridad", "frontend-design"]);

function walkJsFiles(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      out.push(...walkJsFiles(full));
    } else if (e.isFile() && extname(e.name) === ".mjs") {
      out.push(full);
    }
  }
  return out;
}

function readFileUtf8(filePath) {
  const buf = readFileSync(filePath);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString("utf8");
  }
  return buf.toString("utf8");
}

const allFiles = walkJsFiles(skillsRoot);
const files = allFiles.filter((f) => !f.startsWith(sharedDir + sep));

let modifiedCount = 0;
let skippedCount = 0;

for (const filePath of files) {
  const content = readFileUtf8(filePath);

  // Detect bare exitFromResultGuarded( calls (not already exitFromResultGuarded)
  const hasBareCalls = /(?<!\w)exitFromResult\((?!Guarded)/.test(content);
  if (!hasBareCalls) { skippedCount++; continue; }

  let modified = content;

  // Step 1: Add exitFromResultGuarded to import if not already present
  if (!modified.includes("exitFromResultGuarded")) {
    const importRe = /(import\s*\{[^}]*?)(exitFromResult)(\s*[,}]?)([^}]*\}\s*from\s*["'][^"']*_shared[^"']*["'])/g;
    const importMatch = importRe.exec(modified);
    if (importMatch) {
      const before = importMatch[1] + importMatch[2];
      const trailing = importMatch[3];
      const rest = importMatch[4];
      modified = modified.slice(0, importMatch.index) + before + "," + " exitFromResultGuarded" + trailing + rest + modified.slice(importMatch.index + importMatch[0].length);
    }
  }

  // Step 2: Replace call-site exitFromResult( → exitFromResultGuarded(
  // Negative lookahead (?!Guarded) prevents matching already-migrated calls.
  modified = modified.replace(/(?<!\w)exitFromResult\((?!Guarded)/g, "exitFromResultGuarded(");

  if (modified !== content) {
    writeFileSync(filePath, modified, "utf8");
    console.log(`  ✅ ${relative(skillsRoot, filePath)}`);
    modifiedCount++;
  }
}

console.log(`\n✅ Applied exitFromResultGuarded to ${modifiedCount} script(s).`);
if (skippedCount > 0) console.log(`⏭️  Skipped ${skippedCount} already-migrated script(s).`);

#!/usr/bin/env node
/**
 * Skill Validator — agentskills.io spec compliance checker
 *
 * Usage:
 *   node validate-skills.mjs [path] [--json] [--strict]
 *
 * Default path: current working directory (recursive)
 *
 * Exit codes:
 *   0 = pass (only warnings or clean)
 *   1 = errors found
 *   2 = invalid arguments
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, basename, relative, resolve, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const args = process.argv.slice(2);
let jsonOutput = false;
let strictMode = false;
let skipIndexSync = false;
let targetPath = process.cwd();

for (const arg of args) {
  if (arg === "--json") jsonOutput = true;
  else if (arg === "--strict") strictMode = true;
  else if (arg === "--skip-index-sync") skipIndexSync = true;
  else if (arg === "--help" || arg === "-h") {
    printHelp();
    process.exit(0);
  } else if (!arg.startsWith("-")) {
    targetPath = resolve(arg);
  }
}

if (!statSafe(targetPath)) {
  console.error(`Path not found: ${targetPath}`);
  process.exit(2);
}

const results = [];
let totalErrors = 0;
let totalWarnings = 0;
let totalInfo = 0;

function statSafe(p) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

function walkSkills(dir) {
  const out = [];
  const stat = statSafe(dir);
  if (!stat) return out;
  if (stat.isFile() && basename(dir) === "SKILL.md") return [dir];
  if (!stat.isDirectory()) return out;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git" || e.name.startsWith("copia-de-seguridad")) continue;
      out.push(...walkSkills(full));
    } else if (e.isFile() && e.name === "SKILL.md") {
      out.push(full);
    }
  }
  return out;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  return { front: match[1], body: match[2] };
}

function getField(front, field) {
  const re = new RegExp(`^${field}:\\s*(.+?)(?:\\r?\\n[a-z-]+:|$)`, "ms");
  const m = front.match(re);
  return m ? m[1].trim() : null;
}

/**
 * Read a field nested inside a top-level block (e.g. metadata: { field: ... }).
 * Handles 2-space YAML indentation. Returns trimmed string value or null.
 */
function getNestedField(front, parent, field) {
  // Find the parent's start line and capture everything up to the next
  // non-indented line (column 0 key) or end of frontmatter.
  const startRe = new RegExp(`^${parent}:\\s*$`, "m");
  const startMatch = front.match(startRe);
  if (!startMatch) return null;
  const startIdx = startMatch.index + startMatch[0].length;
  // Take everything from startIdx onward, but stop at the first line that
  // has no leading whitespace (i.e. next top-level key) or end of string.
  const rest = front.slice(startIdx);
  const lines = rest.split(/\r?\n/);
  const blockLines = [];
  for (const line of lines) {
    if (line === "") { blockLines.push(line); continue; }
    if (!/^\s/.test(line)) break; // next top-level key
    blockLines.push(line);
  }
  const block = blockLines.join("\n");
  // Now find the field inside the block
  const fieldRe = new RegExp(`^\\s+${field}:\\s*(.+?)(?:\\r?\\n\\s+[a-z_-]+:|\\r?\\n[\\S]|$)`, "ms");
  const fm = block.match(fieldRe);
  if (!fm) return null;
  return fm[1].trim();
}

function validate(file, catalogNames) {
  const issues = [];
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch (err) {
    return [{ severity: "error", check: "read", msg: `Cannot read file: ${err.message}` }];
  }

  const parsed = parseFrontmatter(content);
  if (!parsed) {
    issues.push({ severity: "error", check: "frontmatter", msg: "Missing or malformed YAML frontmatter (must start with --- and end with ---)" });
    return issues;
  }
  const { front, body } = parsed;

  const name = getField(front, "name");
  if (!name) {
    issues.push({ severity: "error", check: "name-present", msg: "Missing required field: name" });
  } else {
    if (name.length < 1 || name.length > 64) {
      issues.push({ severity: "error", check: "name-length", msg: `name length ${name.length} not in 1-64` });
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
      issues.push({ severity: "error", check: "name-regex", msg: `name "${name}" must be lowercase letters, digits, and hyphens only` });
    }
    if (name.startsWith("-") || name.endsWith("-")) {
      issues.push({ severity: "error", check: "name-hyphen", msg: `name "${name}" cannot start or end with hyphen` });
    }
    if (name.includes("--")) {
      issues.push({ severity: "error", check: "name-double-hyphen", msg: `name "${name}" cannot contain consecutive hyphens` });
    }
    const parentName = basename(resolve(file, ".."));
    if (name !== parentName) {
      issues.push({ severity: "error", check: "name-folder-match", msg: `name "${name}" does not match parent folder "${parentName}"` });
    }
  }

  const desc = getField(front, "description");
  if (!desc) {
    issues.push({ severity: "error", check: "desc-present", msg: "Missing required field: description" });
  } else {
    if (desc.length < 1 || desc.length > 1024) {
      issues.push({ severity: "error", check: "desc-length", msg: `description length ${desc.length} not in 1-1024` });
    }
    const hasWhat = /[A-Za-z]/.test(desc);
    const hasWhen = /(when|use|if|trigger)/i.test(desc);
    if (hasWhat && !hasWhen) {
      issues.push({ severity: "warning", check: "desc-when", msg: "description should mention when to use the skill (e.g. 'Use when...', 'Triggers on...')" });
    }
  }

  const compat = getField(front, "compatibility");
  if (compat && compat.length > 500) {
    issues.push({ severity: "error", check: "compatibility-length", msg: `compatibility length ${compat.length} > 500` });
  }

  const meta = getField(front, "metadata");
  if (!meta) {
    issues.push({ severity: "info", check: "metadata-missing", msg: "metadata field recommended (include trigger, scope, version)" });
  }

  if (!getField(front, "license")) {
    issues.push({ severity: "info", check: "license-missing", msg: "license field recommended (e.g. MIT)" });
  }

  const npmHits = (body.match(/\bnpm\s/g) || []).length;
  const npxHits = (body.match(/\bnpx\s/g) || []).length;
  if (npmHits > 0) {
    issues.push({ severity: "warning", check: "no-npm", msg: `Found ${npmHits} mention(s) of 'npm' — use 'pnpm' instead` });
  }
  if (npxHits > 0) {
    issues.push({ severity: "warning", check: "no-npx", msg: `Found ${npxHits} mention(s) of 'npx' — use 'pnpm dlx' instead` });
  }

  if (/\bany\b(?!\w)/.test(body) && /typescript/i.test(body)) {
    const codeBlocks = body.match(/```[\s\S]*?```/g) || [];
    const codeText = codeBlocks.join("\n");
    if (/\bany\b/.test(codeText)) {
      issues.push({ severity: "warning", check: "no-any", msg: "Found 'any' in code blocks — use 'unknown' + narrowing with Zod for TS code" });
    }
  }

  const storesTokenLocally = /(?:use|store|save|persist)\s+(?:in\s+)?(?:localStorage|AsyncStorage)/i.test(body) && /(token|jwt)/i.test(body);
  const recommendsCookieInstead = /(?:never|no|nunca|prohibid)\s+.*(?:localStorage|AsyncStorage)/i.test(body) || /HTTP-Only\s+cookie/i.test(body);
  if (storesTokenLocally && !recommendsCookieInstead) {
    issues.push({ severity: "warning", check: "no-localstorage-tokens", msg: "Storing tokens in LocalStorage/AsyncStorage detected — use in-memory + HTTP-only cookies" });
  }

  // Reference checking: verify [text](path) links point to existing files
  // Skip references inside code blocks (templates, examples)
  const bodyWithoutCode = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
  const refMatches = bodyWithoutCode.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g);
  const fileDir = dirname(file);
  for (const match of refMatches) {
    const refPath = match[2];
    // Skip external URLs, anchors, mailto, and template placeholders
    if (refPath.match(/^(https?:|mailto:|#|<)/)) continue;
    if (refPath.includes("<") || refPath.includes(">")) continue;
    // Resolve relative path from the SKILL.md location
    const resolved = resolve(fileDir, refPath);
    if (!existsSync(resolved)) {
      issues.push({ severity: "warning", check: "broken-reference", msg: `Reference "${match[1]}" points to non-existent file: ${refPath}` });
    }
  }

  // License file check: if license references a file, verify it exists
  const licenseVal = getField(front, "license");
  if (licenseVal && licenseVal.match(/\.(txt|md|LICENSE)/i)) {
    const licPath = resolve(fileDir, licenseVal.replace(/^.*?(\S+\.(txt|md))$/i, "$1"));
    if (!existsSync(licPath)) {
      issues.push({ severity: "error", check: "license-file-missing", msg: `License references file "${licenseVal}" but file does not exist` });
    }
  }

  // === Strict schema rules (Blinding hardening, Bloque 3) ===
  // allowed-tools required (error, not warning) — open tool surface risk
  const allowedTools = getField(front, "allowed-tools");
  if (!allowedTools) {
    issues.push({ severity: "error", check: "allowed-tools-required", msg: "Missing required field: allowed-tools (open tool surface is a security risk)" });
  }
  // version must be a quoted semver string "X.Y.Z"
  const versionField = getField(front, "version");
  if (versionField) {
    const v = versionField.trim().replace(/^["']|["']$/g, "");
    if (!/^\d+\.\d+\.\d+$/.test(v)) {
      issues.push({ severity: "error", check: "version-semver", msg: `version "${versionField}" must be a quoted semver string like "1.0.0"` });
    }
  }

  // === Router-relevant metadata schema (F7) ===
  // Fields that the skill-router and skills-loader depend on having a
  // strict shape. Each check fails loud (error) — silent acceptance is
  // what produced the "metadata custom sin contrato" risk that F7 closes.

  // min_diff_lines (metadata.min_diff_lines) must be a positive integer.
  const minDiffLines = getNestedField(front, "metadata", "min_diff_lines");
  if (minDiffLines !== null) {
    const n = parseInt(minDiffLines, 10);
    if (!Number.isFinite(n) || String(n) !== String(minDiffLines).trim() || n <= 0) {
      issues.push({ severity: "error", check: "min-diff-lines-int", msg: `metadata.min_diff_lines "${minDiffLines}" must be a positive integer` });
    }
  }

  // time_budget_sec (metadata.time_budget_sec) must be a positive integer.
  const timeBudget = getNestedField(front, "metadata", "time_budget_sec");
  if (timeBudget !== null) {
    const n = parseInt(timeBudget, 10);
    if (!Number.isFinite(n) || String(n) !== String(timeBudget).trim() || n <= 0) {
      issues.push({ severity: "error", check: "time-budget-sec-int", msg: `metadata.time_budget_sec "${timeBudget}" must be a positive integer` });
    }
  }

  // critical_markers (metadata.critical_markers) must be a non-empty array of
  // non-empty strings.
  const criticalMarkers = getNestedField(front, "metadata", "critical_markers");
  if (criticalMarkers !== null) {
    // Strip leading [ and trailing ]
    const inner = criticalMarkers.replace(/^\[/, "").replace(/\]$/, "").trim();
    if (!inner) {
      issues.push({ severity: "error", check: "critical-markers-empty", msg: "metadata.critical_markers must be a non-empty array" });
    } else {
      const items = inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
      const bad = items.filter((s) => !s);
      if (bad.length > 0) {
        issues.push({ severity: "error", check: "critical-markers-empty-strings", msg: `metadata.critical_markers contains empty string(s)` });
      }
    }
  }

  // deprecated: true requires redirect: pointing to a known skill.
  const deprecatedFlag = getField(front, "deprecated");
  if (deprecatedFlag === "true") {
    const redirectTarget = getField(front, "redirect");
    if (!redirectTarget) {
      issues.push({ severity: "error", check: "deprecated-redirect-required", msg: "deprecated: true requires a non-empty redirect: field" });
    } else if (catalogNames && !catalogNames.has(redirectTarget)) {
      issues.push({ severity: "error", check: "deprecated-redirect-unknown", msg: `redirect "${redirectTarget}" does not match any skill in the catalog` });
    }
  }

  return issues;
}

function printHelp() {
  console.log(`Skill Validator — agentskills.io compliance checker

Usage:
  node validate-skills.mjs [path] [--json] [--strict] [--skip-index-sync]

Options:
  path                 Directory to scan (default: cwd)
  --json               Output JSON for CI
  --strict             Treat warnings as errors
  --skip-index-sync    Skip synchronization checks against SKILLS.md and AGENTS.md
  --help               Show this help

Exit codes:
  0  pass
  1  errors found
  2  invalid arguments
`);
}

function runIndexSyncChecks(catalogNames, skills, targetPath) {
  const issues = [];
  const skillsMdPath = join(targetPath, "SKILLS.md");
  const agentsMdPath = join(targetPath, "AGENTS.md");

  // Verify SKILLS.md exists
  if (!existsSync(skillsMdPath)) {
    issues.push({ severity: "error", check: "index-sync-skills-missing", msg: "SKILLS.md file not found in target path" });
    return issues;
  }
  // Verify AGENTS.md exists
  if (!existsSync(agentsMdPath)) {
    issues.push({ severity: "error", check: "index-sync-agents-missing", msg: "AGENTS.md file not found in target path" });
    return issues;
  }

  const skillsMdContent = readFileSync(skillsMdPath, "utf8");
  const agentsMdContent = readFileSync(agentsMdPath, "utf8");

  // Find all skill files
  const relativeSkillPaths = skills.map(f => relative(targetPath, f).replace(/\\/g, "/"));

  // Check 1: Every skill in the catalog must be in SKILLS.md
  for (const relPath of relativeSkillPaths) {
    const escaped = relPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped);
    if (!re.test(skillsMdContent)) {
      issues.push({ severity: "error", check: "index-sync-missing-skill", msg: `Skill ${relPath} is present in catalog but missing in SKILLS.md` });
    }
  }

  // Check 2: Every skill name in catalog must be in AGENTS.md
  for (const name of catalogNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("\\b" + escaped + "\\b");
    if (!re.test(agentsMdContent)) {
      issues.push({ severity: "error", check: "agents-sync-missing-skill", msg: `Skill name "${name}" is present in catalog but missing in AGENTS.md` });
    }
  }

  // Check 3: Every SKILL.md link in SKILLS.md must exist in catalog (orphan check)
  const linkMatches = skillsMdContent.matchAll(/\[([^\]]*)\]\(([^)]+SKILL\.md)\)/g);
  for (const match of linkMatches) {
    const relLink = match[2];
    if (relLink.startsWith("http")) continue;
    const resolvedPath = resolve(targetPath, relLink);
    if (!existsSync(resolvedPath)) {
      issues.push({ severity: "error", check: "index-sync-orphan", msg: `SKILLS.md references orphan skill link: ${relLink}` });
    }
  }

  return issues;
}

const skills = walkSkills(targetPath);

// First pass: collect all skill names so redirect targets can be validated
// against the catalog. Done before any per-skill validation so redirects
// can point forward to skills defined later in the walk.
const catalogNames = new Set();
for (const file of skills) {
  try {
    const content = readFileSync(file, "utf8");
    const parsed = parseFrontmatter(content);
    if (parsed) {
      const n = getField(parsed.front, "name");
      if (n) catalogNames.add(n);
    }
  } catch {}
}

for (const file of skills) {
  const rel = relative(process.cwd(), file);
  const issues = validate(file, catalogNames);
  for (const issue of issues) {
    if (issue.severity === "error") totalErrors++;
    else if (issue.severity === "warning") totalWarnings++;
    else totalInfo++;
  }
  results.push({ file: rel, issues });
}

if (!skipIndexSync) {
  const syncIssues = runIndexSyncChecks(catalogNames, skills, targetPath);
  if (syncIssues.length > 0) {
    for (const issue of syncIssues) {
      if (issue.severity === "error") totalErrors++;
      else if (issue.severity === "warning") totalWarnings++;
      else totalInfo++;
    }
    results.push({ file: "SKILLS.md / AGENTS.md", issues: syncIssues });
  }
}

const effectiveErrors = strictMode ? totalErrors + totalWarnings : totalErrors;

if (jsonOutput) {
  console.log(JSON.stringify({ errors: totalErrors, warnings: totalWarnings, info: totalInfo, results }, null, 2));
} else {
  const ok = results.filter((r) => r.issues.length === 0);
  const bad = results.filter((r) => r.issues.length > 0);
  console.log(`\n📋 Skill Validator — ${skills.length} SKILL.md files scanned\n`);
  for (const r of results) {
    if (r.issues.length === 0) {
      console.log(`  ✅ ${r.file}`);
    } else {
      console.log(`  ❌ ${r.file}`);
      for (const i of r.issues) {
        const icon = i.severity === "error" ? "🔴" : i.severity === "warning" ? "🟡" : "🔵";
        console.log(`     ${icon} [${i.check}] ${i.msg}`);
      }
    }
  }
  console.log(`\n📊 Summary: ${ok.length} pass · ${bad.length} with issues`);
  console.log(`   ${totalErrors} errors · ${totalWarnings} warnings · ${totalInfo} info`);
  if (strictMode) console.log("   (strict mode: warnings counted as errors)");
}

process.exit(effectiveErrors > 0 ? 1 : 0);

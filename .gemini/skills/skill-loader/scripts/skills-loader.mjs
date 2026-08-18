#!/usr/bin/env node
/**
 * skills-loader.mjs — Tier 0/1 enforcement for the skills catalog.
 *
 * Caches skill frontmatter with mtime in ~/.skill-router-cache.json.
 * Emits tier0-context.json (12 always-on skills, ~2K tokens) on first run
 * or when any Tier 0 source mtime changes.
 * Per-turn, invokes skill-router internally and emits tier1-instructions.txt
 * with ONLY the bodies of skills the router selected via tier1toLoad[].
 *
 * Enforces "route first" via --check: a skill not in Tier 0 or the current
 * turn's tier1toLoad[] is denied.
 *
 * Usage:
 *   node skills-loader.mjs --emit-tier0
 *   node skills-loader.mjs --turn "<query>" [--diff <n>] --emit-tier1
 *   node skills-loader.mjs --check <skill-name> [--turn-cache <file>]
 *   node skills-loader.mjs --status
 *
 * Exit codes: 0 = ok, 1 = not allowed (route-first), 2 = invalid args
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from "node:fs";
import { join, basename, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { findProjectRoot } from "../../_shared/script-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CATALOG_ROOT = resolve(__dirname, "../../..");
const CACHE_PATH = join(homedir(), ".skill-router-cache.json");
const TIER0_PATH = join(CATALOG_ROOT, "00-meta-skills/skill-loader/tier0-context.json");

function getSessionLogPath() {
  const root = findProjectRoot(process.cwd()) || CATALOG_ROOT;
  return join(root, ".skills-used.json");
}

function loadSessionLog(logPath) {
  if (!existsSync(logPath)) {
    return {
      schemaVersion: 1,
      projectRoot: dirname(logPath).replace(/\\/g, "/"),
      turns: []
    };
  }
  try {
    return JSON.parse(readFileSync(logPath, "utf8"));
  } catch {
    return {
      schemaVersion: 1,
      projectRoot: dirname(logPath).replace(/\\/g, "/"),
      turns: []
    };
  }
}

function saveSessionLog(logPath, log) {
  try {
    writeFileSync(logPath, JSON.stringify(log, null, 2), "utf8");
  } catch (err) {
    console.error("⚠️ Failed to write session log:", err.message);
  }
}

function logTurnTelemetry(query, tier1) {
  const logPath = getSessionLogPath();
  const log = loadSessionLog(logPath);
  
  const currentTurn = {
    id: "turn_" + Date.now(),
    timestamp: new Date().toISOString(),
    query: query,
    tier1toLoad: tier1,
    skillsChecked: []
  };
  
  log.turns.push(currentTurn);
  
  if (log.turns.length > 100) {
    log.turns = log.turns.slice(-100);
  }
  
  saveSessionLog(logPath, log);
}

function logCheckTelemetry(skillName, allowed) {
  const logPath = getSessionLogPath();
  if (!existsSync(logPath)) return;
  
  const log = loadSessionLog(logPath);
  if (log.turns.length === 0) return;
  
  const lastTurn = log.turns[log.turns.length - 1];
  
  const alreadyChecked = lastTurn.skillsChecked.some(c => c.skill === skillName && c.allowed === allowed);
  if (!alreadyChecked) {
    lastTurn.skillsChecked.push({
      skill: skillName,
      allowed: allowed,
      timestamp: new Date().toISOString()
    });
    saveSessionLog(logPath, log);
  }
}

// The 12 Tier 0 (always-on) skills. Hardcoded so we don't need to modify
// 12 SKILL.md files; updates here are versioned with the loader.
const TIER0_SKILLS = [
  "skill-router",
  "skill-validator",
  "skill-sync",
  "skill-creator",
  "skill-loader",
  "professional-planner",
  "agents",
  "idea-to-prd-express",
  "project-tracker",
  "session-notes",
  "decision-gate",
  "dod-checker",
];

// ---------- Args ----------
const args = process.argv.slice(2);
let mode = null; // emit-tier0 | emit-tier1 | check | status
let query = null;
let diffLines = null;
let checkName = null;
let turnCache = null; // path to current-turn cache file (for --check)
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--emit-tier0") mode = "emit-tier0";
  else if (args[i] === "--emit-tier1") mode = "emit-tier1";
  else if (args[i] === "--turn") { mode = "emit-tier1"; query = args[++i]; }
  else if (args[i] === "--check") { mode = "check"; checkName = args[++i]; }
  else if (args[i] === "--status") mode = "status";
  else if (args[i] === "--diff") diffLines = parseInt(args[++i], 10);
  else if (args[i] === "--turn-cache") turnCache = args[++i];
  else if (args[i] === "--help" || args[i] === "-h") {
    console.log("Usage: skills-loader.mjs --emit-tier0 | --turn \"<q>\" [--diff <n>] --emit-tier1 | --check <name> | --status");
    process.exit(0);
  }
}

if (!mode) { console.error("Missing mode: --emit-tier0 | --emit-tier1 | --check | --status"); process.exit(2); }

// ---------- Helpers ----------
function statSafe(p) { try { return statSync(p); } catch { return null; } }

function walkSkills(dir, out = []) {
  const stat = statSafe(dir); if (!stat) return out;
  if (stat.isFile() && basename(dir) === "SKILL.md") return [dir];
  if (!stat.isDirectory()) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git" || e.name.startsWith("copia-de-seguridad")) continue;
    if (e.isDirectory()) walkSkills(join(dir, e.name), out);
    else if (e.isFile() && e.name === "SKILL.md") out.push(join(dir, e.name));
  }
  return out;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  return m[1];
}
function getField(fm, field) {
  const re = new RegExp(`^[ \\t]*${field}:\\s*(.+?)(?:\\r?\\n[a-z-]+:|$)`, "ms");
  const m = fm.match(re);
  return m ? m[1].trim() : null;
}
function readFileUtf8(p) {
  const buf = readFileSync(p);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString("utf8");
  }
  return buf.toString("utf8");
}

// ---------- Cache ----------
function loadCache() {
  if (!existsSync(CACHE_PATH)) return { version: 1, files: {}, lastTier0Emit: 0 };
  try { return JSON.parse(readFileSync(CACHE_PATH, "utf8")); } catch { return { version: 1, files: {}, lastTier0Emit: 0 }; }
}
function saveCache(cache) {
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
}

// Build (or refresh) the index of all SKILL.md files with mtime.
function buildIndex(cache) {
  const files = walkSkills(CATALOG_ROOT);
  const index = [];
  for (const f of files) {
    const mtime = statSync(f).mtimeMs;
    const rel = relative(CATALOG_ROOT, f);
    const cached = cache.files[rel];
    let name, desc;
    if (cached && cached.mtime === mtime) {
      // Reuse cached parsed data — no re-read
      name = cached.name;
      desc = cached.desc;
    } else {
      // Re-parse frontmatter
      const content = readFileUtf8(f);
      const fm = parseFrontmatter(content);
      if (!fm) continue;
      name = getField(fm, "name") || basename(dirname(f));
      desc = getField(fm, "description") || "";
      cache.files[rel] = { mtime, name, desc };
    }
    index.push({ name, desc, file: f, rel });
  }
  return index;
}

function findSkillByName(index, name) {
  return index.find((s) => s.name === name);
}

// ---------- Mode: --emit-tier0 ----------
function modeEmitTier0() {
  const cache = loadCache();
  const index = buildIndex(cache);

  // Find all Tier 0 source files and check mtimes
  const tier0Files = TIER0_SKILLS.map((n) => findSkillByName(index, n)).filter(Boolean);
  const maxMtime = Math.max(0, ...tier0Files.map((s) => cache.files[s.rel]?.mtime || 0));

  if (cache.lastTier0Emit >= maxMtime && existsSync(TIER0_PATH)) {
    console.log("✅ tier0-context.json is up to date (no source changes)");
    return;
  }

  // Build tier0-context: name + description of each Tier 0 skill (~2K tokens total)
  const tier0Context = {
    generatedAt: Date.now(),
    schemaVersion: 1,
    skillCount: tier0Files.length,
    skills: tier0Files.map((s) => ({
      name: s.name,
      description: s.desc,
    })),
  };

  // Plain-text version is a compact one-liner per skill for system prompt injection
  const plainText = tier0Context.skills.map((s) => `## ${s.name}\n${s.description}`).join("\n\n");

  mkdirSync(dirname(TIER0_PATH), { recursive: true });
  writeFileSync(TIER0_PATH, JSON.stringify(tier0Context, null, 2), "utf8");
  writeFileSync(TIER0_PATH.replace(/\.json$/, ".md"), plainText, "utf8");

  cache.lastTier0Emit = Date.now();
  saveCache(cache);

  const estTokens = Math.ceil(plainText.length / 4);
  console.log(`✅ Emitted tier0-context.json + tier0-context.md (${tier0Context.skills.length} skills, ~${estTokens} tokens)`);
}

// ---------- Mode: --emit-tier1 ----------
async function modeEmitTier1() {
  if (!query) { console.error("--turn <query> required for --emit-tier1"); process.exit(2); }
  const cache = loadCache();
  const index = buildIndex(cache);
  saveCache(cache);

  // Invoke skill-router.mjs as a child process (uses the actual router with validator).
  // Use spawn with args array to avoid Windows cmd.exe space-in-path issues.
  const { spawn } = await import("node:child_process");
  const routerArgs = ["00-meta-skills/skill-router/scripts/skill-router.mjs", "--query", query, "--json"];
  if (diffLines !== null) routerArgs.push("--diff", String(diffLines));
  const routerResult = await new Promise((resolveP) => {
    const child = spawn(process.execPath, routerArgs, { cwd: CATALOG_ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false;
    const timer = setTimeout(() => { timedOut = true; try { child.kill("SIGKILL"); } catch {} }, 15000);
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => { clearTimeout(timer); resolveP({ stdout, stderr, timedOut, code }); });
    child.on("error", (err) => { clearTimeout(timer); resolveP({ stdout, stderr: stderr + String(err), timedOut, code: 1 }); });
  });
  if (routerResult.timedOut) {
    console.error("❌ skill-router timed out after 15s");
    process.exit(2);
  }
  if (routerResult.code !== 0) {
    console.error("❌ skill-router failed:", routerResult.stderr || routerResult.stdout);
    process.exit(routerResult.code || 2);
  }
  let routerOutput;
  try { routerOutput = JSON.parse(routerResult.stdout); }
  catch (e) {
    console.error("❌ skill-router returned invalid JSON:", routerResult.stdout.slice(0, 200));
    process.exit(2);
  }
  const tier1 = routerOutput.tier1toLoad || [];

  // Write per-turn cache so --check can read it
  const turnCacheFile = join(homedir(), ".skill-router-turn.json");
  writeFileSync(turnCacheFile, JSON.stringify({ query, diffLines, tier1, ts: Date.now() }, null, 2), "utf8");

  // Record turn in session telemetry log
  logTurnTelemetry(query, tier1);

  // Emit tier1-instructions.txt with bodies of the selected skills
  const out = [];
  out.push(`# Tier 1 instructions for: "${query}"`);
  out.push(`# Primary: ${routerOutput.primary || "(none)"} | Confidence: ${routerOutput.confidence}`);
  out.push(`# Selected (${tier1.length}): ${tier1.join(", ")}`);
  out.push("");
  for (const name of tier1) {
    const skill = findSkillByName(index, name);
    if (!skill) { out.push(`<!-- skill "${name}" not found in catalog -->`); continue; }
    const content = readFileUtf8(skill.file);
    out.push(`\n<!-- BEGIN ${name} -->\n`);
    out.push(content);
    out.push(`\n<!-- END ${name} -->\n`);
  }
  const outPath = join(CATALOG_ROOT, "00-meta-skills/skill-loader/tier1-instructions.txt");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, out.join("\n"), "utf8");
  const estTokens = Math.ceil(out.join("\n").length / 4);
  console.log(`✅ Emitted tier1-instructions.txt (${tier1.length} skills, ~${estTokens} tokens)`);
  if (routerOutput.primary == null) console.log(`⚠️  Router returned primary=null (conf=${routerOutput.confidence}); agent decides`);
}

// ---------- Mode: --check <name> ----------
function modeCheck() {
  if (!checkName) { console.error("--check requires a skill name"); process.exit(2); }
  // Tier 0 always allowed
  if (TIER0_SKILLS.includes(checkName)) {
    console.log(JSON.stringify({ allowed: true, tier: 0, name: checkName }));
    return;
  }
  // Otherwise require a turn cache that lists this name in tier1toLoad
  const cacheFile = turnCache || join(homedir(), ".skill-router-turn.json");
  if (!existsSync(cacheFile)) {
    console.log(JSON.stringify({ allowed: false, tier: null, name: checkName, reason: "route-first", hint: "run --turn first" }));
    process.exit(1);
  }
  const tc = JSON.parse(readFileSync(cacheFile, "utf8"));
  if (tc.tier1 && tc.tier1.includes(checkName)) {
    console.log(JSON.stringify({ allowed: true, tier: 1, name: checkName }));
    logCheckTelemetry(checkName, true);
    return;
  }
  logCheckTelemetry(checkName, false);
  console.log(JSON.stringify({ allowed: false, tier: null, name: checkName, reason: "route-first", hint: "this skill was not in the current turn's tier1toLoad" }));
  process.exit(1);
}

// ---------- Mode: --status ----------
function modeStatus() {
  const cache = loadCache();
  console.log("📦 Skill Loader Status");
  console.log(`  Cache:        ${CACHE_PATH}`);
  console.log(`  Catalog root: ${CATALOG_ROOT}`);
  console.log(`  Cached files: ${Object.keys(cache.files).length}`);
  console.log(`  Last tier0:   ${cache.lastTier0Emit ? new Date(cache.lastTier0Emit).toISOString() : "(never)"}`);
  console.log(`  Tier 0 set:   ${TIER0_SKILLS.length} skills`);
  if (existsSync(TIER0_PATH)) {
    const stat = statSync(TIER0_PATH);
    console.log(`  tier0-context.json: ${(stat.size / 1024).toFixed(1)} KB, mtime ${stat.mtime.toISOString()}`);
  } else {
    console.log(`  tier0-context.json: (not emitted yet)`);
  }
}

// ---------- Dispatch ----------
if (mode === "emit-tier0") modeEmitTier0();
else if (mode === "emit-tier1") await modeEmitTier1();
else if (mode === "check") modeCheck();
else if (mode === "status") modeStatus();

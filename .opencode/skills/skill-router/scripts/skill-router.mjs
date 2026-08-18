#!/usr/bin/env node
/**
 * skill-router.mjs — Deterministic router that replaces ~80% of stochastic
 * "which skill do I load?" LLM reasoning with exact trigger matching.
 *
 * v2 hardening:
 *   - Word-boundary regex for trigger matching (no substring traps like
 *     "ref as prop" matching the query "rename a prop").
 *   - Min trigger length 4 (so "a", "to", "adr" are ignored).
 *   - Confidence=1.0 requires an exact trigger word match (not keyword overlap).
 *   - All output is validated by validate-output.mjs before being emitted.
 *
 * Usage:
 *   node skill-router.mjs --query "add OAuth login" [--diff <n>] [--json]
 *
 * Output: { primary, secondary[], confidence, needsSDD, trivial, skipJudgmentDay,
 *           deprecatedHit, tier1toLoad[] }
 *
 * Exit codes: 0 = routed (primary may be null if confidence <0.6),
 *             2 = contract violation (JSON output suppressed).
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateRouterOutput } from "./validate-output.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CATALOG_ROOT = resolve(__dirname, "../../..");

const args = process.argv.slice(2);
let query = null, diffLines = null, jsonOut = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--query") query = args[++i];
  else if (args[i] === "--diff") diffLines = parseInt(args[++i], 10);
  else if (args[i] === "--json") jsonOut = true;
  else if (args[i] === "--help" || args[i] === "-h") {
    console.log("Usage: skill-router.mjs --query \"<text>\" [--diff <n>] [--json]");
    process.exit(0);
  }
}

if (!query) { console.error("Missing --query"); process.exit(2); }

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
function getTriggerArray(fm) {
  const t = getField(fm, "trigger");
  if (!t) return [];
  const inner = t.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!inner) return [];
  return inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MIN_TRIGGER_LENGTH = 4;

// Build skill index
const files = walkSkills(CATALOG_ROOT);
const index = [];
for (const f of files) {
  const content = readFileSync(f, "utf8");
  const fm = parseFrontmatter(content);
  if (!fm) continue;
  const name = getField(fm, "name") || basename(dirname(f));
  const desc = getField(fm, "description") || "";
  const triggers = getTriggerArray(fm);
  const deprecated = getField(fm, "deprecated") === "true";
  const redirect = getField(fm, "redirect");
  const rel = f.replace(CATALOG_ROOT + "\\", "").replace(/\//g, "\\");
  const catMatch = rel.match(/^(\d{2}-[a-z-]+|professional-planner)\\/i);
  const category = catMatch ? catMatch[1] : "root";
  index.push({ name, desc, triggers, deprecated, redirect, category, file: f });
}

// Build set of valid skill names for tier1toLoad validation
const validSkillNames = new Set(index.map((s) => s.name));

// Scoring
const qLower = query.toLowerCase();
const scored = [];
for (const s of index) {
  if (s.deprecated) continue;
  let triggerScore = 0; // from word-boundary exact trigger matches
  let exactHit = false;
  for (const t of s.triggers) {
    if (!t) continue;
    const tLower = t.toLowerCase().trim();
    if (tLower.length < MIN_TRIGGER_LENGTH) continue;
    // Word-boundary regex: full-word/phrase match, no substring traps
    const re = new RegExp("\\b" + escapeRegex(tLower) + "\\b", "i");
    if (re.test(qLower)) {
      triggerScore += 1.0;
      exactHit = true;
    }
  }
  // Description keyword overlap (subordinate — caps confidence <1.0)
  const descLower = s.desc.toLowerCase();
  const queryNouns = qLower.split(/\s+/).filter((w) => w.length >= MIN_TRIGGER_LENGTH);
  let kwHits = 0;
  for (const w of queryNouns) {
    const wRe = new RegExp("\\b" + escapeRegex(w) + "\\b", "i");
    if (wRe.test(descLower)) kwHits++;
  }
  const kwScore = Math.min(kwHits / 3, 0.5);
  const totalScore = triggerScore + kwScore;
  if (totalScore > 0) {
    scored.push({ name: s.name, score: totalScore, triggerScore, kwScore, exactHit, category: s.category });
  }
}
scored.sort((a, b) => b.score - a.score);

// Determine primary + deprecated hit
let primary = null;
let deprecatedHit = null;
let secondary = [];
let confidence = 0;
let triggeredExact = false;

if (scored.length > 0) {
  const top = scored[0];
  confidence = Math.min(top.score, 1.0);
  triggeredExact = top.exactHit;
  // Confidence=1.0 requires exact trigger match (not just keyword overlap)
  if (top.triggerScore < 1.0) confidence = Math.min(confidence, 0.5);
  if (confidence >= 0.6) primary = top.name;
  secondary = scored.slice(1, 4).map((s) => s.name);
} else {
  // Check if query mentions a deprecated skill name → redirect
  for (const s of index) {
    if (s.deprecated) {
      const nameRe = new RegExp("\\b" + escapeRegex(s.name.toLowerCase()) + "\\b", "i");
      if (nameRe.test(qLower)) {
        deprecatedHit = s.name;
        primary = s.redirect; // follow redirect deterministically
        confidence = 1.0;
        triggeredExact = true;
        break;
      }
    }
  }
}

// Heuristics (deterministic, no LLM)
const CRITICAL_MARKERS = /\b(auth|payment|prisma|migration|socketio|ssl|secret|jwt|bcrypt|sql|checkout|env|token|password|keys|schema|seed|credentials)\b/i;
const touchedCategories = new Set(scored.slice(0, 5).map((s) => s.category));
const needsSDD = touchedCategories.size >= 2 && (diffLines === null || diffLines > 20);
const trivial = diffLines !== null && diffLines < 20 && !CRITICAL_MARKERS.test(qLower);
const skipJudgmentDay = diffLines !== null && diffLines < 100 && !CRITICAL_MARKERS.test(qLower);

const tier1toLoad = primary ? [primary, ...secondary.slice(0, 2)] : secondary.slice(0, 3);

const output = {
  primary,
  secondary,
  confidence: Math.round(confidence * 100) / 100,
  needsSDD,
  trivial,
  skipJudgmentDay,
  deprecatedHit,
  tier1toLoad,
};

// Validate output against the contract
const validation = validateRouterOutput(output, { validSkillNames, triggeredExact });
if (!validation.ok) {
  const envelope = { primary: null, secondary: [], confidence: 0, error: "contract-violation", violations: validation.violations };
  if (jsonOut) console.log(JSON.stringify(envelope, null, 2));
  else console.error("❌ skill-router contract violation:", validation.violations.join("; "));
  process.exit(2);
}

if (jsonOut) console.log(JSON.stringify(output, null, 2));
else {
  console.log("🎯 Skill Router");
  console.log(`  Query:       "${query}"`);
  console.log(`  Primary:     ${primary || "(none, agent decides)"}`);
  console.log(`  Secondary:   [${secondary.join(", ")}]`);
  console.log(`  Confidence:  ${output.confidence}`);
  console.log(`  needsSDD:    ${needsSDD}`);
  console.log(`  trivial:     ${trivial}`);
  console.log(`  skipJD:      ${skipJudgmentDay}`);
  if (deprecatedHit) console.log(`  deprecatedHit: ${deprecatedHit} -> redirect to ${primary}`);
  console.log(`  Tier1 load:  [${tier1toLoad.join(", ")}]`);
}

#!/usr/bin/env node
/**
 * resolve-default.mjs — Deterministic "default seguro" resolver for decision-gate.
 *
 * Implements the algorithm from references/default-resolution.md as code.
 * The agent does NOT invent the default — this script does.
 *
 * Algorithm (strict order, stop at first match):
 *   1. Engram search --topic <x>
 *      - If a prior decision in Engram contains an option name → default = that
 *        option, source: "engram-prev".
 *      - If a prior decision exists but no option name matches → conflict;
 *        default: null, source: "engram-conflict".
 *      - If Engram binary is unavailable (timeout, missing, error) → fall
 *        through with source: "engram-unavailable" (NOT a default by itself,
 *        we continue to steps 2/3/4 but the source is overridden if they
 *        match).
 *      - If Engram is reachable and has no hits → source: "none" and we
 *        continue to steps 2/3/4.
 *   2. Lower `risk` field → option with lowest risk wins; tie-break by
 *      reversibilidad ("alta" > "media" > "baja"). Source: "lower-risk".
 *   3. Domain rule by marker:
 *      - topic matches /\b(auth|jwt|ssl|session|cookie|token)\b/i → default =
 *        option whose tags/stakeholder do NOT include "new-auth-boundary".
 *      - topic matches /\b(payment|checkout|charge|refund|invoice)\b/i →
 *        default = option whose tags do NOT include "changes-billing-flow".
 *      Source: "domain-rule".
 *   4. Fallback: default: null, source: "none".
 *
 * CLI:
 *   node resolve-default.mjs --topic "<text>" --options '<json>'
 *     --options format: [{"name":"A","risk":"bajo","reversibilidad":"alta","stakeholder_impact":"solo dev team","tags":["auth"]}, ...]
 *     --engram-path <path>     Optional. Default: C:\Users\j1347\bin\engram.exe (Windows) or "engram" (POSIX)
 *
 * Output (stdout, JSON):
 *   { "default": "<name|null>", "default_source": "<src>", "conflict_with": "<id|null>" }
 *
 * Exit codes: 0 = resolved (default or explicit null), 1 = engram-conflict
 * (still emits JSON), 2 = invalid args.
 */
import { existsSync } from "node:fs";
import { resolve, fileURLToPath } from "node:url";
import { runScriptGuarded } from "../../_shared/script-utils.mjs";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

// ---------- Args ----------
const args = process.argv.slice(2);
let topic = null;
let optionsJson = null;
let engramPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--topic") topic = args[++i];
  else if (args[i] === "--options") optionsJson = args[++i];
  else if (args[i] === "--engram-path") engramPath = args[++i];
  else if (args[i] === "--help" || args[i] === "-h") {
    console.log("Usage: resolve-default.mjs --topic \"<text>\" --options '<json>' [--engram-path <path>]");
    process.exit(0);
  }
}

if (!topic || !optionsJson) {
  console.error("Missing --topic or --options");
  process.exit(2);
}

let options;
try { options = JSON.parse(optionsJson); } catch (e) {
  console.error("Invalid JSON in --options:", e.message);
  process.exit(2);
}
if (!Array.isArray(options) || options.length === 0) {
  console.error("--options must be a non-empty JSON array");
  process.exit(2);
}

function defaultEngramPath() {
  if (process.platform === "win32") return "C:\\Users\\j1347\\bin\\engram.exe";
  return "engram";
}
const ENGRAM = engramPath || defaultEngramPath();

// ---------- Helpers ----------
function emit(obj, code = 0) {
  console.log(JSON.stringify(obj));
  process.exit(code);
}

async function engramSearch(query) {
  const cmd = `"${ENGRAM}" search "${query.replace(/"/g, "")}"`;
  const raw = await runScriptGuarded(cmd, { timeoutMs: 10000 });
  if (raw.timedOut) return { ok: false, reason: "timeout" };
  if (raw.code !== 0) return { ok: false, reason: `exit:${raw.code}` };
  return { ok: true, stdout: raw.stdout };
}

function parseEngramHits(stdout) {
  const trimmed = stdout.trim();
  if (/^No memories found/i.test(trimmed)) return [];
  const hits = [];
  const blocks = trimmed.split(/\n\n(?=\[\d+\])/);
  for (const block of blocks) {
    const m = block.match(/^\[(\d+)\]\s+#(\d+)\s+\((\w+)\)\s+—\s+(.+)$/m);
    if (m) {
      const id = parseInt(m[2], 10);
      const type = m[3];
      const title = m[4].trim();
      const bodyLines = [];
      for (const line of block.split("\n").slice(1)) {
        const stripped = line.replace(/^    /, "");
        if (!stripped.startsWith("20") && !stripped.includes("| project:") && !stripped.includes("| scope:")) {
          bodyLines.push(stripped);
        }
      }
      hits.push({ id, type, title, body: bodyLines.join("\n").trim() });
    }
  }
  return hits;
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
// English noise words that should never be treated as option names,
// even when they happen to be a single letter or common short word.
const NAME_NOISE = new Set(["a", "an", "the", "i", "it", "is", "in", "to", "of", "on", "at", "or", "and", "we", "us"]);

// Decision-context patterns that indicate a deliberate option choice.
// An option name matched inside one of these is treated as a real prior
// decision; a name matched outside (e.g. the article "a") is treated as
// noise and ignored.
const DECISION_VERBS = ["select", "choose", "chose", "pick", "picked", "adopt", "adopted", "use", "used", "going with", "we pick", "we use", "we choose", "we adopt", "we go with", "use of", "use:", "selected", "picked"];

function findOptionInText(text, opts) {
  const lower = text.toLowerCase();
  for (const opt of opts) {
    const name = (opt.name || "").toString();
    if (!name) continue;
    if (NAME_NOISE.has(name.toLowerCase())) continue;
    const nameRe = new RegExp("\\b" + escapeRegex(name) + "\\b", "i");
    if (!nameRe.test(lower)) continue;
    // Check if the match is in a decision-verb context
    for (const verb of DECISION_VERBS) {
      // Pattern: <verb> ... <name>  OR  <name> ... <verb/chose/selected>
      const before = new RegExp(escapeRegex(verb) + "[\\s\\S]{0,80}\\b" + escapeRegex(name) + "\\b", "i");
      const after = new RegExp("\\b" + escapeRegex(name) + "\\b[\\s\\S]{0,80}\\b(" + DECISION_VERBS.join("|") + ")\\b", "i");
      if (before.test(lower) || after.test(lower)) {
        return opt.name;
      }
    }
    // For longer option names (≥3 chars) without a decision verb, accept
    // the match — the word is distinctive enough.
    if (name.length >= 3) return opt.name;
  }
  return null;
}

const RISK_ORDER = { bajo: 0, bajo_bajo: 0, low: 0, medio: 1, medium: 1, alto: 2, high: 2 };
const REV_ORDER = { alta: 2, high: 2, media: 1, medium: 1, baja: 0, low: 0 };

function resolveByLowestRisk(opts) {
  const withRisk = opts.filter((o) => o.risk && RISK_ORDER.hasOwnProperty(String(o.risk).toLowerCase()));
  if (withRisk.length === 0) return null;
  withRisk.sort((a, b) => {
    const ra = RISK_ORDER[String(a.risk).toLowerCase()];
    const rb = RISK_ORDER[String(b.risk).toLowerCase()];
    if (ra !== rb) return ra - rb;
    const reva = REV_ORDER[String(a.reversibilidad || "").toLowerCase()] ?? -1;
    const revb = REV_ORDER[String(b.reversibilidad || "").toLowerCase()] ?? -1;
    return revb - reva; // higher reversibility wins
  });
  return withRisk[0].name;
}

function resolveByDomainRule(topic, opts) {
  const t = topic.toLowerCase();
  const AUTH = /\b(auth|jwt|ssl|session|cookie|token)\b/i;
  const PAY = /\b(payment|checkout|charge|refund|invoice)\b/i;
  if (AUTH.test(t)) {
    const safe = opts.find((o) => !(o.tags || []).map((x) => String(x).toLowerCase()).includes("new-auth-boundary"));
    if (safe) return { name: safe.name, source: "domain-rule" };
  }
  if (PAY.test(t)) {
    const safe = opts.find((o) => !(o.tags || []).map((x) => String(x).toLowerCase()).includes("changes-billing-flow"));
    if (safe) return { name: safe.name, source: "domain-rule" };
  }
  return null;
}

// ---------- Main ----------
async function main() {
  // Pre-check: if engram path doesn't exist on Windows default, treat as unavailable
  let engramAvailable = true;
  if (engramPath === null && process.platform === "win32" && !existsSync(ENGRAM)) {
    engramAvailable = false;
  }

  // Step 1: Engram search
  if (engramAvailable) {
    const search = await engramSearch(topic);
    if (search.ok) {
      const hits = parseEngramHits(search.stdout);
      if (hits.length > 0) {
        // Look for an option name reinforced by the prior decision
        for (const hit of hits) {
          const text = `${hit.title}\n${hit.body}`;
          const matched = findOptionInText(text, options);
          if (matched) {
            emit({ default: matched, default_source: "engram-prev", conflict_with: String(hit.id) });
          }
        }
        // Hit exists but no option name matches → conflict
        emit({ default: null, default_source: "engram-conflict", conflict_with: String(hits[0].id) }, 1);
      }
      // hits.length === 0: fall through to step 2/3/4 with engram reachable
    } else {
      // Engram unavailable (timeout, error, etc.) — fall through
      engramAvailable = false;
    }
  }

  // Step 2: Lower risk field
  const lowerRisk = resolveByLowestRisk(options);
  if (lowerRisk) {
    const src = engramAvailable ? "lower-risk" : "engram-unavailable-lower-risk";
    emit({ default: lowerRisk, default_source: src, conflict_with: null });
  }

  // Step 3: Domain rule
  const domain = resolveByDomainRule(topic, options);
  if (domain) {
    const src = engramAvailable ? "domain-rule" : "engram-unavailable-domain-rule";
    emit({ default: domain.name, default_source: src, conflict_with: null });
  }

  // Step 4: None
  const src = engramAvailable ? "none" : "engram-unavailable";
  emit({ default: null, default_source: src, conflict_with: null });
}

main().catch((err) => {
  emit({ default: null, default_source: "error", conflict_with: null, error: String(err && err.message || err) }, 2);
});

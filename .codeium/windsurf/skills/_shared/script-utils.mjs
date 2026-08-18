/**
 * Shared utilities for skill scripts.
 * Used by: audit-auth.mjs, check-limiters.mjs, check-id-consistency.mjs,
 *          generate-frontend-types.mjs, check-env-loading.mjs,
 *          check-module-level-loads.mjs, validate-build-config.mjs
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";

/**
 * @typedef {Object} Issue
 * @property {"error"|"warning"|"info"} severity
 * @property {string} check
 * @property {string} msg
 * @property {string} [file]
 * @property {number} [line]
 */

/**
 * @typedef {Object} ScriptResult
 * @property {Issue[]} issues
 * @property {number} errors
 * @property {number} warnings
 * @property {number} info
 * @property {boolean} ok
 */

/**
 * Walk all files matching a filter (recursive).
 * @param {string} dir
 * @param {(name: string) => boolean} filter
 * @returns {string[]}
 */
export function walkFiles(dir, filter) {
  const out = [];
  const stat = statSafe(dir);
  if (!stat || !stat.isDirectory()) return out;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git" || e.name === "dist" || e.name === "build") continue;
      out.push(...walkFiles(full, filter));
    } else if (e.isFile() && filter(e.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Read file as UTF-8 string, stripping BOM if present.
 * @param {string} filePath
 * @returns {string}
 */
export function readFileUtf8(filePath) {
  const buf = readFileSync(filePath);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString("utf8");
  }
  return buf.toString("utf8");
}

/**
 * Parse frontmatter from a markdown file.
 * @param {string} content
 * @returns {{ front: string, body: string } | null}
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  return { front: match[1], body: match[2] };
}

/**
 * @param {string} p
 * @returns {import("node:fs").Stats | null}
 */
function statSafe(p) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

/**
 * Format and print a ScriptResult to console.
 * @param {ScriptResult} result
 * @param {string} scriptName
 */
export function printResult(result, scriptName) {
  const cwd = process.cwd();
  console.log(`\n📋 ${scriptName} — ${result.issues.length} issue(s)\n`);
  if (result.issues.length === 0) {
    console.log("  ✅ No issues found\n");
    return;
  }
  for (const i of result.issues) {
    const icon = i.severity === "error" ? "🔴" : i.severity === "warning" ? "🟡" : "🔵";
    const fileStr = i.file ? ` ${relative(cwd, i.file)}${i.line ? `:${i.line}` : ""}` : "";
    console.log(`  ${icon} [${i.check}]${fileStr}`);
    console.log(`     ${i.msg}`);
  }
  console.log(`\n📊 ${result.errors} errors · ${result.warnings} warnings · ${result.info} info\n`);
}

/**
 * Exit with code based on result (0 if ok, 1 if errors).
 * @param {ScriptResult} result
 */
export function exitFromResult(result) {
  process.exit(result.errors > 0 ? 1 : 0);
}

/**
 * Build a ScriptResult from an array of Issues.
 * @param {Issue[]} issues
 * @returns {ScriptResult}
 */
export function buildResult(issues) {
  let errors = 0, warnings = 0, info = 0;
  for (const i of issues) {
    if (i.severity === "error") errors++;
    else if (i.severity === "warning") warnings++;
    else info++;
  }
  return { issues, errors, warnings, info, ok: errors === 0 };
}

/**
 * Find the project root by walking up from a start dir looking for a marker file.
 * Prioritizes monorepo-specific markers (pnpm-workspace.yaml, turbo.json) over
 * package.json, which can appear in subdirectories like .opencode/.
 * @param {string} [startDir]
 * @param {string[]} [markers]
 * @returns {string | null}
 */
export function findProjectRoot(startDir, markers) {
  // Default: prioritize monorepo root markers, then package.json with apps/ dir
  const checks = markers || ["pnpm-workspace.yaml", "turbo.json"];
  let dir = resolve(startDir || process.cwd());
  for (let i = 0; i < 20; i++) {
    // Check specific markers first
    if (checks.some((m) => existsSync(join(dir, m)))) return dir;
    // Fallback: package.json + apps/ directory (workspace root heuristic)
    if (existsSync(join(dir, "package.json")) && existsSync(join(dir, "apps"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/**
 * Run a shell command with a hard timeout (default 15s).
 * Kills the subprocess on timeout. Returns a synthetic ScriptResult on failure
 * so the agent never hangs or sees malformed output.
 * @param {string} cmd
 * @param {{ timeoutMs?: number, cwd?: string }} [opts]
 * @returns {Promise<{ stdout: string, stderr: string, timedOut: boolean, code: number | null }>}
 */
export async function runScriptGuarded(cmd, opts = {}) {
  const { spawn } = await import("node:child_process");
  const timeoutMs = opts.timeoutMs ?? 15000;
  return new Promise((resolveP) => {
    let child;
    try {
      child = spawn(cmd, { shell: process.platform === "win32", cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      resolveP({ stdout: "", stderr: String(err), timedOut: false, code: 1 });
      return;
    }
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill("SIGKILL"); } catch {}
    }, timeoutMs);
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolveP({ stdout, stderr, timedOut, code });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolveP({ stdout, stderr: stderr + String(err), timedOut, code: 1 });
    });
  });
}

/**
 * Normalize raw script output into a ScriptResult. Use after runScriptGuarded
 * when the child's stdout might not be valid JSON / might be plain text.
 * @param {{ stdout: string, stderr: string, timedOut: boolean, code: number | null }} raw
 * @returns {import("./script-utils").ScriptResult}
 */
export function normalizeScriptOutput(raw) {
  if (raw.timedOut) {
    return { issues: [{ severity: "error", check: "timeout", msg: "script exceeded timeout and was killed" }], errors: 1, warnings: 0, info: 0, ok: false };
  }
  // Try parse stdout as ScriptResult JSON
  try {
    const parsed = JSON.parse(raw.stdout);
    if (parsed && "issues" in parsed && "errors" in parsed) return parsed;
  } catch {}
  // Synthesize wrapper from raw stderr/stdout tail
  const tail = (raw.stderr || raw.stdout).slice(-500);
  return { issues: [{ severity: "error", check: "raw-output", msg: tail }], errors: 1, warnings: 0, info: 0, ok: false };
}

/**
 * Exit guarded: like exitFromResult but never hangs. Wraps exit in a try/catch.
 * Use in scripts that may hang on I/O.
 * @param {import("./script-utils").ScriptResult} result
 * @param {number} [timeoutMs]
 */
export function exitFromResultGuarded(result, timeoutMs = 15000) {
  const timer = setTimeout(() => process.exit(2), timeoutMs);
  try {
    process.exit(result.errors > 0 ? 1 : 0);
  } catch {
    clearTimeout(timer);
    process.exit(1);
  }
}

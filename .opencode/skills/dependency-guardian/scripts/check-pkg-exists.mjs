#!/usr/bin/env node
/**
 * check-pkg-exists.mjs — Hard gate against package hallucination.
 *
 * Scans staged files (or a directory) for import/require/from statements and
 * verifies every referenced package exists either in the project's node_modules
 * or in the public npm registry (via `pnpm view <pkg> version`).
 *
 * Usage:
 *   node check-pkg-exists.mjs                  # scan project root (cwd)
 *   node check-pkg-exists.mjs --staged          # scan git staged files only
 *   node check-pkg-exists.mjs --dir <path>      # scan a specific directory
 *   node check-pkg-exists.mjs --json            # JSON output for CI
 *
 * Exit codes: 0 = OK, 1 = hallucinated packages found (BLOCKS commit)
 *
 * Wire as a pre-commit hook:
 *   - From dependency-guardian skill: reference this script.
 *   - With gga: add to .gga custom rules, or call directly in .git/hooks/pre-commit.
 *   - Standalone: `node ./06-code-quality/dependency-guardian/scripts/check-pkg-exists.mjs --staged`
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, basename, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { walkFiles, readFileUtf8, buildResult, printResult, exitFromResultGuarded, runScriptGuarded, findProjectRoot } from "../../_shared/script-utils.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const args = process.argv.slice(2);
let mode = "dir";
let target = null;
let jsonOut = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--staged") mode = "staged";
  else if (args[i] === "--dir") { mode = "dir"; target = resolve(args[++i]); }
  else if (args[i] === "--json") jsonOut = true;
  else if (args[i] === "--help" || args[i] === "-h") {
    console.log("Usage: check-pkg-exists.mjs [--staged | --dir <path>] [--json]");
    process.exit(0);
  }
}

// Extensions we scan for imports
const SCAN_EXT = /^(?!.*\.d\.ts$).*\.(mjs|js|jsx|ts|tsx|cjs|mts|cts)$/i;

// Built-in Node modules that don't need to be installed
const BUILTINS = new Set([
  "assert", "async_hooks", "buffer", "child_process", "cluster", "console",
  "constants", "crypto", "dgram", "diagnostics_channel", "dns", "domain",
  "events", "fs", "http", "http2", "https", "inspector", "module", "net",
  "os", "path", "perf_hooks", "process", "punycode", "querystring", "readline",
  "repl", "stream", "string_decoder", "sys", "timers", "tls", "trace_events",
  "tty", "url", "util", "v8", "vm", "wasi", "worker_threads", "zlib",
]);

// Relative imports start with ./ or ../ or / or #
function isRelative(spec) {
  return spec.startsWith("./") || spec.startsWith("../") || spec === "." || spec === ".." || spec.startsWith("/") || spec.startsWith("#");
}

// Bun/Node subpath exports via package.json "imports" — skip, they resolve locally
function isSubpathImport(spec) { return spec.startsWith("#"); }

// tsconfig/jsconfig path aliases — common ones start with @, ~, @/, @/, ~/, @@
const ALIAS_PREFIXES = ["@", "~", "@@", "$"];
function looksLikeAlias(spec) {
  if (isRelative(spec) || isSubpathImport(spec)) return false;
  const first = spec.split("/")[0];
  return ALIAS_PREFIXES.some((p) => first === p || (first.startsWith(p) && first.length > 1 && first !== "@types"));
}

// @types/* are dev-only type packages — skip if installed or if registry has them
function isTypesPkgPkg(spec) {
  return spec.startsWith("@types/");
}

// Cache of tsconfig paths per file (avoids re-reading + re-parsing)
const tsconfigCache = new Map();

// Read tsconfig.json paths field. Uses the real `typescript` package parser
// (ts.readConfigFile) when available — handles extends, references, comments,
// multi-line. Falls back to a regex heuristic if typescript is not installed.
async function loadTsconfigPaths(fromFile) {
  if (tsconfigCache.has(fromFile)) return tsconfigCache.get(fromFile);
  let dir = dirname(fromFile);
  let prefixes = [];
  for (let i = 0; i < 30; i++) {
    for (const name of ["tsconfig.json", "jsconfig.json"]) {
      const candidate = join(dir, name);
      if (!existsSync(candidate)) continue;
      // Try real TS parser first (handles extends + references + comments)
      try {
        // dynamic import — don't crash the whole script if typescript missing
        const ts = (await import("typescript")).default || await import("typescript");
        const parsed = ts.readConfigFile(candidate, (p) => readFileSync(p, "utf8"));
        const opts = parsed.config?.compilerOptions || {};
        const paths = opts.paths || {};
        prefixes = Object.keys(paths).map((k) => k.replace(/\*$/, ""));
        // If extends, follow it (TS does this in readConfigFile via parseJsonConfigFileContent,
        // but readConfigFile alone doesn't resolve extends. Practical heuristic: walk up.)
        tsconfigCache.set(fromFile, prefixes);
        return prefixes;
      } catch {
        // typescript not installed OR parse failed — regex fallback below
      }
      // Regex fallback: handles single-file tsconfig without extends
      try {
        const raw = readFileSync(candidate, "utf8");
        const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
        const m = stripped.match(/"paths"\s*:\s*\{([\s\S]*?)\}/);
        if (m) {
          const entries = m[1].split(",").map((e) => e.trim()).filter(Boolean);
          for (const e of entries) {
            const keyM = e.match(/"([^"]+)"\s*:/);
            if (keyM) prefixes.push(keyM[1].replace(/\*$/, ""));
          }
        }
      } catch {}
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  tsconfigCache.set(fromFile, prefixes);
  return prefixes;
}

// Subpath imports via package.json "imports" field, declared in the file's package.json ancestors
function loadPkgImports(fromFile) {
  let dir = dirname(fromFile);
  for (let i = 0; i < 30; i++) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (pkg.imports && typeof pkg.imports === "object") return Object.keys(pkg.imports);
      } catch {}
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return [];
}

// Skip type-only imports? No — we still check them, they can hallucinate too.

/** Extract import specifiers from file content */
function extractSpecifiers(content) {
  const specs = new Set();
  // ESM: import ... from "x"  /  import "x"  /  import(... "x")
  const importRe = /\bimport\s+(?:[^'"`]+\s+from\s+)?["'`]([^"'`]+)["'`]/g;
  // CJS: require("x")
  const requireRe = /\brequire\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
  // Dynamic import: import("x")
  const dynRe = /\bimport\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
  // Export from (rare but valid)
  const exportRe = /\bexport\s+(?:[^'"`]+\s+from\s+)?["'`]([^"'`]+)["'`]/g;
  for (const re of [importRe, requireRe, dynRe, exportRe]) {
    let m;
    while ((m = re.exec(content)) !== null) specs.add(m[1]);
  }
  return [...specs];
}

/** Get the "base" package name (handles @scope/name, @scope/name/sub, and bare) */
function basePackage(spec) {
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
  }
  return spec.split("/")[0];
}

/** Check if a package is installed in the project's node_modules (recursive向上) */
function isInstalled(pkg, fromFile) {
  let dir = dirname(fromFile);
  for (let i = 0; i < 30; i++) {
    const candidate = join(dir, "node_modules", pkg);
    if (existsSync(candidate)) return true;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

/** Check if a package exists in the public registry via pnpm view */
async function registryHas(pkg) {
  const raw = await runScriptGuarded(`pnpm view "${pkg}" version`, { timeoutMs: 15000 });
  if (raw.timedOut) return false;
  return raw.code === 0;
}

/**
 * Run an async worker function over an array of items with a max concurrency
 * limit. Returns a Promise that resolves to an array of results in the same
 * order as items. Unlike Promise.all, this never has more than `limit`
 * concurrent in-flight calls.
 */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function runOne() {
    while (true) {
      const idx = next++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, runOne);
  await Promise.all(runners);
  return results;
}

function getStagedFiles() {
  try {
    const out = execSync("git diff --cached --name-only --diff-filter=ACMR", { encoding: "utf8" });
    return out.split(/\r?\n/).filter(Boolean).map((p) => resolve(p));
  } catch {
    return [];
  }
}

const projectRoot = findProjectRoot(__dirname) || process.cwd();
const scanDir = target || projectRoot;

let files;
if (mode === "staged") {
  files = getStagedFiles().filter((f) => SCAN_EXT.test(f) && existsSync(f));
} else {
  files = walkFiles(scanDir, (n) => SCAN_EXT.test(n));
}

const issues = [];
const seen = new Set(); // avoid duplicate registry checks for same pkg
const cache = new Map(); // pkg -> boolean (isInstalled result reused)

// Phase 1: walk all files, collect (pkg, spec, file) tuples that need
// registry verification. We dedupe by pkg globally so each package is
// only looked up once even if many files import it.
const registryLookups = new Map(); // pkg -> [{ spec, file }]
for (const file of files) {
  let content;
  try { content = readFileUtf8(file); } catch { continue; }
  for (const spec of extractSpecifiers(content)) {
    if (isRelative(spec) || isSubpathImport(spec)) continue;
    if (looksLikeAlias(spec)) {
      const aliases = await loadTsconfigPaths(file);
      if (aliases.some((p) => spec.startsWith(p))) continue;
    }
    const pkg = basePackage(spec);
    if (BUILTINS.has(pkg)) continue;
    if (seen.has(pkg + "@" + file)) continue;
    seen.add(pkg + "@" + file);

    const installed = cache.has(pkg) ? cache.get(pkg) : (() => {
      const r = isInstalled(pkg, file);
      cache.set(pkg, r);
      return r;
    })();

    if (installed) continue;

    // Not installed locally — queue for registry check.
    if (!registryLookups.has(pkg)) registryLookups.set(pkg, []);
    registryLookups.get(pkg).push({ spec, file });
  }
}

// Phase 2: batch registry checks with concurrency limit 5.
const CONCURRENCY = 5;
const pkgs = [...registryLookups.keys()];
const registryResults = await mapWithConcurrency(pkgs, CONCURRENCY, async (pkg) => ({
  pkg,
  inRegistry: await registryHas(pkg),
}));

// Phase 3: emit issues from results (iterate files in original order).
for (const { pkg, inRegistry } of registryResults) {
  const refs = registryLookups.get(pkg);
  for (const { spec, file } of refs) {
    if (!inRegistry) {
      issues.push({
        severity: "error",
        check: "package-hallucination",
        msg: `Package "${pkg}" (imported via "${spec}") does not exist in node_modules nor in the public registry. Likely hallucinated.`,
        file,
      });
    } else {
      issues.push({
        severity: "warning",
        check: "package-not-installed",
        msg: `Package "${pkg}" exists in registry but is not installed. Run \`pnpm add ${pkg}\` before committing.`,
        file,
      });
    }
  }
}

const result = buildResult(issues);
if (jsonOut) {
  console.log(JSON.stringify(result));
} else {
  printResult(result, "Package Hallucination Gate");
}
exitFromResultGuarded(result);
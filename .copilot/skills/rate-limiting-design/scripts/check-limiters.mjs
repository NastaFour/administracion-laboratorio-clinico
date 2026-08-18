#!/usr/bin/env node
/**
 * check-limiters.mjs
 *
 * Detects shared rate limiters between auth-login and session endpoints.
 * Usage:
 *   node check-limiters.mjs [--apiDir <path>]
 *
 * Exit codes: 0 = OK, 1 = shared limiter detected
 */

import { resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { walkFiles, readFileUtf8, buildResult, printResult, exitFromResult, exitFromResultGuarded, findProjectRoot } from "../../_shared/script-utils.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const args = process.argv.slice(2);
let apiDir = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--apiDir" && args[i + 1]) apiDir = resolve(args[++i]);
}
if (!apiDir) {
  const root = findProjectRoot(__dirname);
  apiDir = root ? join(root, "apps", "api", "src") : resolve(process.cwd(), "apps", "api", "src");
}

const issues = [];

const routeFiles = walkFiles(apiDir, (name) => /\.(t|j)s$/.test(name) && /route/i.test(name));

// Collect limiter usage per route file
const limiterMap = new Map(); // limiterName -> [{ file, paths }]

for (const file of routeFiles) {
  const content = readFileUtf8(file);
  const relFile = relative(process.cwd(), file);

  // Find route path declarations
  const routePaths = [...content.matchAll(/router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g)]
    .map((m) => m[2]);

  // Find limiter middleware usage
  const limiterUsages = [...content.matchAll(/(\w*[Ll]imiter\w*)\s*[,)]/g)]
    .map((m) => m[1])
    .filter((n) => n && !["rateLimit", "limiter"].includes(n));

  for (const limiter of limiterUsages) {
    if (!limiterMap.has(limiter)) limiterMap.set(limiter, []);
    limiterMap.get(limiter).push({ file: relFile, paths: routePaths });
  }
}

// Check for limiters applied to both login and session paths
for (const [limiter, usages] of limiterMap) {
  const allPaths = usages.flatMap((u) => u.paths);
  const hasLogin = allPaths.some((p) => /\/login|\/register|\/forgot/i.test(p));
  const hasSession = allPaths.some((p) => /\/me|\/refresh|\/logout/i.test(p));

  if (hasLogin && hasSession) {
    issues.push({
      severity: "error",
      check: "shared-limiter",
      msg: `Limiter "${limiter}" is applied to BOTH auth-login and session endpoints. This caused bug #3: /auth/me 429 loop. Split into authLimiter (5 req/15min) + sessionLimiter (120 req/min). Affected paths: ${allPaths.join(", ")}`,
    });
  }
}

// Check for limiter without skip function on session endpoints
for (const [limiter, usages] of limiterMap) {
  const allPaths = usages.flatMap((u) => u.paths);
  const hasSession = allPaths.some((p) => /\/me|\/refresh/i.test(p));
  if (hasSession) {
    // Check if limiter definition has skip
    for (const usage of usages) {
      const content = readFileUtf8(resolve(process.cwd(), usage.file));
      const limiterDefRegex = new RegExp(`const\\s+${limiter}\\s*=\\s*rateLimit\\s*\\(`, "i");
      if (limiterDefRegex.test(content) && !/skip\s*:/.test(content)) {
        issues.push({
          severity: "warning",
          check: "no-skip-function",
          msg: `Limiter "${limiter}" on session endpoints has no skip function. Consider skip: (req) => req.path === '/me' to avoid counting session checks.`,
          file: usage.file,
        });
      }
    }
  }
}

const result = buildResult(issues);
printResult(result, "Rate Limiter Checker");
exitFromResultGuarded(result);

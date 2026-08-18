#!/usr/bin/env node
/**
 * audit-auth.mjs
 *
 * Scans codebase for auth anti-patterns.
 * Usage:
 *   node audit-auth.mjs [--rootDir <path>]
 *
 * Exit codes: 0 = clean, 1 = anti-patterns found
 */

import { resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { walkFiles, readFileUtf8, buildResult, printResult, exitFromResult, exitFromResultGuarded, findProjectRoot } from "../../_shared/script-utils.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const args = process.argv.slice(2);
let rootDir = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--rootDir" && args[i + 1]) rootDir = resolve(args[++i]);
}
if (!rootDir) rootDir = findProjectRoot(__dirname) || process.cwd();

const issues = [];

// Scan .ts, .tsx, .js, .jsx files in apps/ (excluding node_modules, dist)
const srcFiles = walkFiles(join(rootDir, "apps"), (name) => /\.(t|j)sx?$/.test(name));

const antiPatterns = [
  { regex: /localStorage\.(setItem|getItem)\s*\(\s*['"`](?:token|accessToken|access_token|jwt)['"`]/i, severity: "error", check: "localstorage-token", msg: "Access token stored in localStorage. Use in-memory (Zustand) + httpOnly cookie for refresh." },
  { regex: /sessionStorage\.(setItem|getItem)\s*\(\s*['"`](?:token|accessToken|access_token|jwt)['"`]/i, severity: "error", check: "sessionstorage-token", msg: "Access token stored in sessionStorage. Use in-memory + httpOnly cookie." },
  { regex: /AsyncStorage\.(setItem|getItem)\s*\(\s*['"`](?:token|accessToken|access_token|jwt)['"`]/i, severity: "error", check: "asyncstorage-token", msg: "Token in AsyncStorage. Use expo-secure-store (SecureStore) for mobile." },
  { regex: /window\.location\.(href|assign|replace)\s*=\s*['"`]\/?(login|auth\/login)['"`]/i, severity: "error", check: "interceptor-redirect", msg: "Hard redirect to /login in interceptor. Each page should handle 401 individually." },
  { regex: /persist\s*\(/g, severity: "warning", check: "persist-middleware", msg: "Zustand persist middleware detected. Verify it does NOT persist the access token." },
];

for (const file of srcFiles) {
  const content = readFileUtf8(file);
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const ap of antiPatterns) {
      if (ap.regex.test(line)) {
        issues.push({
          severity: ap.severity,
          check: ap.check,
          msg: `${ap.msg} — Found: ${line.trim().substring(0, 100)}`,
          file,
          line: i + 1,
        });
      }
      ap.regex.lastIndex = 0;
    }
  }
}

// Check for setToken in store files without getMe
const storeFiles = srcFiles.filter((f) => /store|auth/i.test(f));
for (const file of storeFiles) {
  const content = readFileUtf8(file);
  if (/setToken/i.test(content) && !/getMe/i.test(content)) {
    issues.push({
      severity: "warning",
      check: "settoken-without-getme",
      msg: `Store file has setToken but no getMe. Login may appear successful but session won't persist via cookie. Call getMe() on App mount instead.`,
      file,
    });
  }
}

const result = buildResult(issues);
printResult(result, "Auth Flow Audit");
exitFromResultGuarded(result);

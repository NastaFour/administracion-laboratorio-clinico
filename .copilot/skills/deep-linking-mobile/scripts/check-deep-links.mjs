#!/usr/bin/env node
/**
 * check-deep-links.mjs
 * Verifies app.json has scheme configured for deep linking.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildResult, printResult, exitFromResult, exitFromResultGuarded, findProjectRoot } from "../../_shared/script-utils.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = findProjectRoot(__dirname);
const issues = [];

const appJsonPaths = [
  root ? join(root, "apps", "mobile-client", "app.json") : null,
  root ? join(root, "apps", "mobile-barber", "app.json") : null,
].filter(Boolean);

for (const p of appJsonPaths) {
  if (!existsSync(p)) {
    issues.push({ severity: "warning", check: "app-json-missing", msg: `app.json not found at ${p}` });
    continue;
  }
  const content = readFileSync(p, "utf8");
  try {
    const json = JSON.parse(content);
    if (!json.expo?.scheme) {
      issues.push({ severity: "error", check: "no-scheme", msg: `app.json at ${p} has no expo.scheme. Deep links won't work. Add "scheme": "barbergo".` });
    }
    if (!json.expo?.ios?.associatedDomains) {
      issues.push({ severity: "warning", check: "no-universal-links", msg: `No iOS associatedDomains in ${p}. Universal links won't work.` });
    }
  } catch {
    issues.push({ severity: "error", check: "invalid-json", msg: `Invalid JSON in ${p}` });
  }
}

const result = buildResult(issues);
printResult(result, "Deep Link Checker");
exitFromResultGuarded(result);

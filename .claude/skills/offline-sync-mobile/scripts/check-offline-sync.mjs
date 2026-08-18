#!/usr/bin/env node
/**
 * check-offline-sync.mjs
 * Detects API calls without offline queue integration.
 * Usage: node check-offline-sync.mjs [--srcDir <path>]
 */
import { resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { walkFiles, readFileUtf8, buildResult, printResult, exitFromResult, exitFromResultGuarded, findProjectRoot } from "../../_shared/script-utils.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const args = process.argv.slice(2);
let srcDir = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--srcDir" && args[i + 1]) srcDir = resolve(args[++i]);
}
if (!srcDir) {
  const root = findProjectRoot(__dirname);
  srcDir = root ? join(root, "apps", "mobile-client", "src") : resolve(process.cwd(), "apps/mobile-client/src");
}

const issues = [];
const srcFiles = walkFiles(srcDir, (name) => /\.(t|j)sx?$/.test(name));

for (const file of srcFiles) {
  const content = readFileUtf8(file);
  const relFile = relative(process.cwd(), file);

  // Detect fetch/axios calls without offline queue check
  if (/api\.(create|update|delete)\w*\s*\(/i.test(content) && !/offline|useOfflineQueue|isOnline/i.test(content)) {
    issues.push({
      severity: "warning",
      check: "no-offline-check",
      msg: `API mutation call without offline queue check. If offline, the call will fail. Consider wrapping with useOfflineQueue or checking isOnline.`,
      file: relFile,
    });
  }
}

const result = buildResult(issues);
printResult(result, "Offline Sync Checker");
exitFromResultGuarded(result);

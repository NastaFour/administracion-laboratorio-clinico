#!/usr/bin/env node
/**
 * check-reports.mjs
 * Detects report endpoints that are synchronous (not using background jobs for large reports).
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
  apiDir = root ? join(root, "apps", "api", "src") : resolve(process.cwd(), "apps/api/src");
}

const issues = [];
const srcFiles = walkFiles(apiDir, (name) => /\.(t|j)s$/.test(name));

for (const file of srcFiles) {
  const content = readFileUtf8(file);
  const relFile = relative(process.cwd(), file);

  // Find report endpoints
  if (/\/reports?\//i.test(content) || /export.*csv|generate.*pdf/i.test(content)) {
    // Check if it uses background queue
    if (!/queue|bullmq|worker/i.test(content)) {
      issues.push({
        severity: "warning",
        check: "sync-report",
        msg: `Report/export endpoint without background job. Large reports will block the request thread. Consider using BullMQ for async generation.`,
        file: relFile,
      });
    }
  }
}

const result = buildResult(issues);
printResult(result, "Reports Checker");
exitFromResultGuarded(result);

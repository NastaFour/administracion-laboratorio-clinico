#!/usr/bin/env node
/**
 * check-jobs.mjs
 *
 * Detects BullMQ job definitions without retry strategy or idempotency (jobId).
 *
 * Usage:
 *   node check-jobs.mjs [--apiDir <path>]
 *
 * Exit codes: 0 = OK, 1 = risky job found
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

  // Find .add( calls (BullMQ job scheduling)
  const addMatches = [...content.matchAll(/\.add\s*\(\s*["'`]([^"'`]+)["'`]/g)];
  for (const match of addMatches) {
    const jobName = match[1];
    const matchIdx = match.index;

    // Get surrounding 500 chars to check for jobId and attempts
    const context = content.substring(matchIdx, matchIdx + 500);

    if (!/jobId/i.test(context)) {
      issues.push({
        severity: "warning",
        check: "job-no-id",
        msg: `Job "${jobName}" scheduled without jobId. Without a unique jobId, the same job can be scheduled multiple times (no idempotency). Add jobId: \`${jobName}-\${bookingId}\`.`,
        file: relFile,
      });
    }

    if (!/attempts/i.test(context)) {
      issues.push({
        severity: "warning",
        check: "job-no-retry",
        msg: `Job "${jobName}" scheduled without attempts/retry strategy. Transient failures will not be retried. Add attempts: 3 and backoff: { type: "exponential", delay: 5000 }.`,
        file: relFile,
      });
    }
  }
}

const result = buildResult(issues);
printResult(result, "Background Jobs Checker");
exitFromResultGuarded(result);

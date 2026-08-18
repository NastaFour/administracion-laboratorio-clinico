#!/usr/bin/env node
/**
 * check-booking-queries.mjs
 *
 * Detects booking creation queries that don't use $transaction
 * or don't have an inline conflict check.
 *
 * Usage:
 *   node check-booking-queries.mjs [--apiDir <path>]
 *
 * Exit codes: 0 = OK, 1 = risky booking query found
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

  // Find files that create bookings
  if (/booking\.create\s*\(|prisma\.booking\.create\s*\(/i.test(content)) {
    // Check if it's inside a $transaction
    const hasTransaction = /\$transaction\s*\(/i.test(content);

    if (!hasTransaction) {
      issues.push({
        severity: "error",
        check: "booking-no-transaction",
        msg: `Booking creation found without $transaction. Race condition risk: two clients can book the same slot. Wrap createBooking in prisma.$transaction with inline conflict check.`,
        file: relFile,
      });
    }

    // Check for conflict check (findFirst/findMany with overlap condition)
    const hasConflictCheck = /findFirst|findMany/i.test(content) &&
      (/startTime|endTime|overlap|conflict/i.test(content));

    if (!hasConflictCheck) {
      issues.push({
        severity: "error",
        check: "booking-no-conflict-check",
        msg: `Booking creation found without conflict check. Always check for overlapping bookings before creating. See booking-scheduling-domain/conflict-resolution.md for the ACID pattern.`,
        file: relFile,
      });
    }
  }
}

const result = buildResult(issues);
printResult(result, "Booking Query Checker");
exitFromResultGuarded(result);

#!/usr/bin/env node
/**
 * check-id-consistency.mjs
 *
 * Detects endpoints where req.params.id is used in where: { <otherField>: id },
 * which causes "not found" errors due to ID mismatch.
 *
 * Usage:
 *   node check-id-consistency.mjs [--apiDir <path>]
 *
 * Exit codes: 0 = OK, 1 = ID mismatch detected
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

const srcFiles = walkFiles(apiDir, (name) => /\.(t|j)s$/.test(name));

for (const file of srcFiles) {
  const content = readFileUtf8(file);
  const relFile = relative(process.cwd(), file);
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect: router.get/post/...("/:id", ...) or ("/:userId", ...)
    const routeMatch = line.match(/router\.(get|post|put|patch|delete)\s*\(\s*['"`]\/[^'"`]*:(\w+)['"`]/);
    if (routeMatch) {
      const paramName = routeMatch[2]; // "id" or "userId"

      // Look ahead 10 lines for where: { <otherField>: <paramName> }
      for (let j = i; j < Math.min(i + 15, lines.length); j++) {
        const whereLine = lines[j];
        // Match where: { fieldName: req.params.paramName }
        const whereMatch = whereLine.match(/where:\s*\{[^}]*?(\w+):\s*req\.params\.(\w+)/);
        if (whereMatch) {
          const whereField = whereMatch[1];
          const usedParam = whereMatch[2];
          if (usedParam === paramName && whereField !== paramName) {
            issues.push({
              severity: "error",
              check: "id-mismatch",
              msg: `Route param :${paramName} used in where: { ${whereField}: req.params.${paramName} }. URL param name != where field name → likely "not found" bug. If URL is /:id, filter by where: { id: ... }, not where: { ${whereField}: ... }.`,
              file: relFile,
              line: j + 1,
            });
          }
          break;
        }
      }
    }

    // Also detect findFirst/findUnique with where mismatch
    const findMatch = line.match(/find(?:First|Unique)\s*\(\s*\{[^}]*?where:\s*\{[^}]*?(\w+):\s*(?:req\.params\.|id\b)/);
    // This is a heuristic; the route-based check above is more precise
  }
}

const result = buildResult(issues);
printResult(result, "ID Consistency Checker");
exitFromResultGuarded(result);

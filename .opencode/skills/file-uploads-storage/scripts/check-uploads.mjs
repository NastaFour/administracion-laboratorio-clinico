#!/usr/bin/env node
/**
 * check-uploads.mjs
 *
 * Detects upload endpoints without file validation (fileFilter or limits).
 *
 * Usage:
 *   node check-uploads.mjs [--apiDir <path>]
 *
 * Exit codes: 0 = OK, 1 = unvalidated upload found
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

  // Find multer config: multer({ ... })
  const multerMatches = [...content.matchAll(/multer\s*\(\s*\{([^}]*)\}/gs)];
  for (const match of multerMatches) {
    const config = match[1];

    if (!/fileFilter/i.test(config)) {
      issues.push({
        severity: "error",
        check: "upload-no-filter",
        msg: `Multer config without fileFilter. Any file type can be uploaded (security risk). Add fileFilter to validate mimetype.`,
        file: relFile,
      });
    }

    if (!/limits/i.test(config)) {
      issues.push({
        severity: "error",
        check: "upload-no-limits",
        msg: `Multer config without limits. No max file size → DoS risk (unlimited upload size). Add limits: { fileSize: 5*1024*1024 }.`,
        file: relFile,
      });
    }
  }
}

const result = buildResult(issues);
printResult(result, "Upload Validator Checker");
exitFromResultGuarded(result);

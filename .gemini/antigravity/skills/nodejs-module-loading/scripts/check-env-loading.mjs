#!/usr/bin/env node
/**
 * check-env-loading.mjs
 *
 * Detects dotenv.config() called too late in the import chain.
 * Specifically: dotenv.config() in a file that is NOT the first to read process.env.
 *
 * Usage:
 *   node check-env-loading.mjs [--srcDir <path>]
 *
 * Exit codes: 0 = OK, 1 = late dotenv detected
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
  srcDir = root ? join(root, "apps", "api", "src") : resolve(process.cwd(), "apps/api/src");
}

const issues = [];

const srcFiles = walkFiles(srcDir, (name) => /\.(t|j)s$/.test(name));

// Find files that call dotenv.config()
const dotenvConfigFiles = [];
const dotenvImportConfigFiles = [];

for (const file of srcFiles) {
  const content = readFileUtf8(file);
  const relFile = relative(process.cwd(), file);

  // Detect: dotenv.config() call (not import "dotenv/config")
  if (/dotenv\.config\s*\(/.test(content) && !/import\s+["']dotenv\/config["']/.test(content)) {
    dotenvConfigFiles.push({ file: relFile, content });
    // Check if this file also reads process.env
    const lines = content.split("\n");
    const configLineIdx = lines.findIndex((l) => /dotenv\.config\s*\(/.test(l));
    const envReadLineIdx = lines.findIndex((l) => /process\.env\./.test(l));

    if (envReadLineIdx >= 0 && configLineIdx >= 0 && envReadLineIdx < configLineIdx) {
      issues.push({
        severity: "error",
        check: "env-read-before-config",
        msg: `File reads process.env (line ${envReadLineIdx + 1}) BEFORE calling dotenv.config() (line ${configLineIdx + 1}). Env vars will be undefined. Fix: add "import 'dotenv/config'" at the top of the file that reads process.env.`,
        file: relFile,
        line: envReadLineIdx + 1,
      });
    }
  }

  // Detect correct: import "dotenv/config"
  if (/import\s+["']dotenv\/config["']/.test(content)) {
    dotenvImportConfigFiles.push(relFile);
  }
}

// Check: if any file reads process.env but neither it nor its imports load dotenv
const envReadingFiles = [];
for (const file of srcFiles) {
  const content = readFileUtf8(file);
  if (/process\.env\./.test(content)) {
    envReadingFiles.push({ file: relative(process.cwd(), file), content });
  }
}

// If there are env-reading files but no dotenv loading at all
if (envReadingFiles.length > 0 && dotenvConfigFiles.length === 0 && dotenvImportConfigFiles.length === 0) {
  issues.push({
    severity: "warning",
    check: "no-dotenv",
    msg: `Files read process.env but no dotenv loading detected (neither dotenv.config() nor import "dotenv/config"). Env vars will be undefined unless set externally.`,
  });
}

// Positive feedback: correct usage
if (dotenvImportConfigFiles.length > 0) {
  issues.push({
    severity: "info",
    check: "correct-dotenv-import",
    msg: `Found correct "import 'dotenv/config'" in: ${dotenvImportConfigFiles.join(", ")}`,
  });
}

const result = buildResult(issues);
printResult(result, "Env Loading Checker");
exitFromResultGuarded(result);

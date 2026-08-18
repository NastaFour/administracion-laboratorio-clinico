#!/usr/bin/env node
/**
 * check-hardcoded-strings.mjs
 * Detects hardcoded user-facing strings in JSX (text outside t() calls).
 * Usage: node check-hardcoded-strings.mjs [--srcDir <path>]
 * Exit: 0 = OK, 1 = hardcoded strings found
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
  srcDir = root ? join(root, "apps", "web", "src") : resolve(process.cwd(), "apps/web/src");
}

const issues = [];
const srcFiles = walkFiles(srcDir, (name) => /\.tsx$/.test(name));

for (const file of srcFiles) {
  const content = readFileUtf8(file);
  const relFile = relative(process.cwd(), file);
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detect >Text< without t() — heuristic: >Word< where Word has 3+ letters
    const matches = [...line.matchAll(/>\s*([A-ZÁÉÍÓÚÑa-záéíóúñ]{3,}(?:\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]+)*)\s*</g)];
    for (const m of matches) {
      const text = m[1];
      // Skip if it looks like a component name (PascalCase without space)
      if (/^[A-Z][a-z]+$/.test(text) && !text.includes(" ")) continue;
      issues.push({
        severity: "warning",
        check: "hardcoded-string",
        msg: `Possible hardcoded string "${text}" in JSX. Use t("key") for i18n. Line: ${line.trim().substring(0, 80)}`,
        file: relFile,
        line: i + 1,
      });
    }
  }
}

const result = buildResult(issues);
printResult(result, "Hardcoded Strings Checker");
exitFromResultGuarded(result);

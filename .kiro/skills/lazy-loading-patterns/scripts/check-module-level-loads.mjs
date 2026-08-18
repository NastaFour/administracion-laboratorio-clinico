#!/usr/bin/env node
/**
 * check-module-level-loads.mjs
 *
 * Detects heavy library calls at module level (outside functions/hooks/components).
 * Catches: loadStripe(), new Map(), L.map() called at top of file.
 *
 * Usage:
 *   node check-module-level-loads.mjs [--srcDir <path>]
 *
 * Exit codes: 0 = OK, 1 = module-level load detected
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

const srcFiles = walkFiles(srcDir, (name) => /\.(t|j)sx?$/.test(name));

// Heavy library calls to detect at module level
const heavyCalls = [
  { regex: /loadStripe\s*\(/g, name: "loadStripe", fix: "Wrap in getStripe() singleton lazy function" },
  { regex: /new\s+L\.map\s*\(/g, name: "new L.map()", fix: "Move into useEffect or dynamic import('leaflet')" },
  { regex: /L\.map\s*\(/g, name: "L.map()", fix: "Move into useEffect or dynamic import('leaflet')" },
  { regex: /new\s+Map\s*\(/g, name: "new Map()", fix: "Move into hook/component (may be a Leaflet Map)" },
];

for (const file of srcFiles) {
  const content = readFileUtf8(file);
  const relFile = relative(process.cwd(), file);
  const lines = content.split("\n");

  // Track brace depth to determine if we're at module level (depth 0)
  let depth = 0;
  let inComment = false;
  let inString = false;
  let stringChar = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Simple state tracking for strings and comments
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      const next = line[j + 1];
      if (inComment) {
        if (ch === "*" && next === "/") { inComment = false; j++; }
        continue;
      }
      if (inString) {
        if (ch === "\\") { j++; continue; }
        if (ch === stringChar) inString = false;
        continue;
      }
      if (ch === "/" && next === "/") break; // line comment
      if (ch === "/" && next === "*") { inComment = true; j++; continue; }
      if (ch === '"' || ch === "'" || ch === "`") { inString = true; stringChar = ch; continue; }
      if (ch === "{" || ch === "(" || ch === "[") depth++;
      if (ch === "}" || ch === ")" || ch === "]") depth--;
    }

    // At module level (depth 0 after processing the line)
    // Check for heavy calls
    for (const hc of heavyCalls) {
      hc.regex.lastIndex = 0;
      if (hc.regex.test(line)) {
        // Check if this line is at module level (not inside a function/block)
        // Heuristic: if depth <= 1 at end of line and line doesn't start with export function/const/useEffect
        const trimmed = line.trim();
        const isInsideBlock = /^(export\s+)?(function|const|let|var|async|useEffect|useCallback|useMemo|if|for|while|return|const\s+\w+\s*=)/.test(trimmed) === false && depth > 0;
        const isExport = /^export\s+(function|const|class)/.test(trimmed);

        // More precise: check if the call is on the right side of an export const or at top level
        if (depth <= 1 && !isInsideBlock && !isExport) {
          // It's likely at module level
          issues.push({
            severity: "error",
            check: "module-level-load",
            msg: `${hc.name} called at module level (line ${i + 1}). This runs on every import, even pages that don't use it. ${hc.fix}. Line: ${trimmed.substring(0, 80)}`,
            file: relFile,
            line: i + 1,
          });
        }
      }
    }
  }
}

const result = buildResult(issues);
printResult(result, "Module-Level Load Checker");
exitFromResultGuarded(result);

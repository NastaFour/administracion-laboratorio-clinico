#!/usr/bin/env node
/**
 * check-interactions.mjs
 * Detects interactive elements without hover/focus/active states, and `transition: all`.
 */
import { resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { walkFiles, readFileUtf8, buildResult, printResult, exitFromResult, exitFromResultGuarded, findProjectRoot } from "../../_shared/script-utils.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const args = process.argv.slice(2);
let srcDirs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--srcDir" && args[i + 1]) srcDirs.push(resolve(args[++i]));
}
if (srcDirs.length === 0) {
  const root = findProjectRoot(__dirname);
  srcDirs = root ? [join(root, "apps", "web", "src")] : [resolve(process.cwd(), "src")];
}

const issues = [];

for (const srcDir of srcDirs) {
  const files = walkFiles(srcDir, (name) => /\.(t|j)sx?$/.test(name));
  for (const file of files) {
    const content = readFileUtf8(file);
    const relFile = relative(process.cwd(), file);
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect `transition: all` (performance killer)
      if (/transition\s*:\s*all/i.test(line) || /transition-all/i.test(line)) {
        issues.push({
          severity: "warning",
          check: "transition-all",
          msg: `transition: all animates every property (expensive). Specify exact properties: transition: transform, opacity. See micro-interactions skill.`,
          file: relFile, line: i + 1,
        });
      }

      // Detect <button> or <a> without hover/focus in same line or nearby
      if (/<button|<a\s/i.test(line)) {
        // Check next 5 lines for hover/focus/active
        const nearby = lines.slice(i, i + 5).join(" ");
        if (!/hover|focus|active|onPress|onClick/i.test(nearby)) {
          issues.push({
            severity: "info",
            check: "dead-interactive",
            msg: `Interactive element (<button>/<a>) without hover/focus/active state. Add hover:-translate-y, focus-visible:ring, active:scale for tactile feedback.`,
            file: relFile, line: i + 1,
          });
        }
      }

      // Detect animating layout properties (width, height, top, left, margin)
      if (/transition[^;]*\b(width|height|top|left|margin|padding)\b/i.test(line)) {
        issues.push({
          severity: "warning",
          check: "animate-layout-prop",
          msg: `Animating layout property (width/height/top/left/margin) forces browser reflow (janky). Use transform: scale/translate instead.`,
          file: relFile, line: i + 1,
        });
      }
    }
  }
}

const result = buildResult(issues);
printResult(result, "Micro-Interactions Checker");
exitFromResultGuarded(result);

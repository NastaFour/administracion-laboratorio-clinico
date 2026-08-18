#!/usr/bin/env node
/**
 * check-effects.mjs
 * Detects backdrop-blur without fallback, opacity without bg color, and filter:blur on large elements.
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
  const files = walkFiles(srcDir, (name) => /\.(t|j)sx?$|\.css$/.test(name));
  for (const file of files) {
    const content = readFileUtf8(file);
    const relFile = relative(process.cwd(), file);
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // backdrop-blur without @supports fallback
      if (/backdrop-filter|backdrop-blur/i.test(line)) {
        // Check if file has @supports fallback
        if (!/@supports\s+not/i.test(content)) {
          issues.push({
            severity: "warning",
            check: "no-backup-fallback",
            msg: `backdrop-filter used without @supports fallback. Older browsers (Firefox < 103) won't render glass. Add: @supports not (backdrop-filter: blur(16px)) { ... solid bg ... }`,
            file: relFile, line: i + 1,
          });
        }
      }

      // opacity on background without color
      if (/opacity:\s*0\.[1-5]/.test(line) && !/background|bg-|color/i.test(line)) {
        issues.push({
          severity: "info",
          check: "opacity-without-bg",
          msg: `Low opacity without visible background color. May be invisible. Ensure element has bg color/gradient.`,
          file: relFile, line: i + 1,
        });
      }

      // filter: blur on potentially large elements
      if (/filter:\s*blur\(/i.test(line) && !/backdrop-filter/i.test(line)) {
        issues.push({
          severity: "warning",
          check: "filter-blur-performance",
          msg: `filter: blur() is a performance killer on large elements. Use backdrop-filter instead (GPU-accelerated).`,
          file: relFile, line: i + 1,
        });
      }
    }
  }
}

const result = buildResult(issues);
printResult(result, "Visual Effects Checker");
exitFromResultGuarded(result);

#!/usr/bin/env node
/**
 * check-motion.mjs
 * Detects framer-motion usage without prefers-reduced-motion, and inline animate without variants.
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

    // Check if file uses framer-motion
    const usesMotion = /from\s+["']framer-motion["']|from\s+["']motion["']/.test(content);

    if (usesMotion) {
      // Check for prefers-reduced-motion usage
      if (!/useReducedMotion|prefers-reduced-motion|ReducedMotion/.test(content)) {
        issues.push({
          severity: "warning",
          check: "no-reduced-motion",
          msg: `File uses framer-motion but does not check useReducedMotion(). Add: const shouldReduceMotion = useReducedMotion(); and conditionally disable animations.`,
          file: relFile,
        });
      }

      // Check for inline animate prop without variants (harder to orchestrate)
      const inlineAnimateMatches = [...content.matchAll(/animate\s*=\s*\{\{[^}]+\}\}/g)];
      if (inlineAnimateMatches.length > 3) {
        issues.push({
          severity: "info",
          check: "inline-animate-no-variants",
          msg: `${inlineAnimateMatches.length} inline animate={{...}} props found. Consider using variants for reusability and stagger orchestration.`,
          file: relFile,
        });
      }
    }

    // Check for layout property animation (width/height) instead of layout prop
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (/framer-motion|motion/.test(lines[i]) && /animate.*(?:width|height)\s*:/.test(lines[i])) {
        issues.push({
          severity: "warning",
          check: "animate-layout-prop",
          msg: `Animating width/height in framer-motion forces layout recalculation (janky). Use layout prop or transform: scale instead.`,
          file: relFile, line: i + 1,
        });
      }
    }
  }
}

const result = buildResult(issues);
printResult(result, "Motion Checker");
exitFromResultGuarded(result);

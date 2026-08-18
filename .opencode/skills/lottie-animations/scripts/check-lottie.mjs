#!/usr/bin/env node
/**
 * check-lottie.mjs
 * Detects large Lottie files, missing lazy load, and missing reduced-motion fallback.
 */
import { existsSync, statSync } from "node:fs";
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
  srcDirs = root ? [join(root, "apps", "web", "src"), join(root, "apps")] : [resolve(process.cwd(), "src")];
}

const issues = [];

// Check for large .json/.lottie files
for (const srcDir of srcDirs) {
  const root = findProjectRoot(__dirname);
  const searchDirs = root ? [join(root, "apps")] : [srcDir];
  for (const sd of searchDirs) {
    if (!existsSync(sd)) continue;
    const lottieFiles = walkFiles(sd, (name) => /\.(lottie|json)$/.test(name) && /animation|lottie/i.test(name));
    for (const file of lottieFiles) {
      const stat = statSync(file);
      const sizeKB = Math.round(stat.size / 1024);
      if (sizeKB > 100) {
        issues.push({
          severity: "warning",
          check: "large-lottie",
          msg: `Lottie file is ${sizeKB}KB (> 100KB). Optimize: use .lottie format, simplify keyframes, reduce frame rate.`,
          file: relative(process.cwd(), file),
        });
      }
    }
  }
}

// Check component usage
for (const srcDir of srcDirs) {
  const files = walkFiles(srcDir, (name) => /\.(t|j)sx?$/.test(name));
  for (const file of files) {
    const content = readFileUtf8(file);
    const relFile = relative(process.cwd(), file);

    if (/lottie|LottieView|DotLottie/i.test(content)) {
      // Check for reduced-motion fallback
      if (!/useReducedMotion|prefers-reduced-motion/i.test(content)) {
        issues.push({
          severity: "warning",
          check: "no-reduced-motion-fallback",
          msg: `Lottie used without prefers-reduced-motion fallback. Provide a static image for users who prefer reduced motion.`,
          file: relFile,
        });
      }

      // Check for lazy load
      if (!/lazy|dynamic|import\(|LazyLottie/i.test(content)) {
        issues.push({
          severity: "info",
          check: "no-lazy-load",
          msg: `Lottie imported statically. Consider lazy-loading to reduce initial bundle size.`,
          file: relFile,
        });
      }
    }
  }
}

const result = buildResult(issues);
printResult(result, "Lottie Checker");
exitFromResultGuarded(result);

#!/usr/bin/env node
/**
 * check-motion-a11y.mjs
 * Detects animations without prefers-reduced-motion, transition: all, and layout property animations.
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

    // Check if file has any animation/transition
    const hasAnimation = /transition\s*:|animation\s*:|@keyframes|framer-motion|gsap|reanimated/i.test(content);

    if (hasAnimation) {
      // Check for prefers-reduced-motion
      if (!/prefers-reduced-motion|useReducedMotion|motion-reduce|motion-safe/i.test(content)) {
        issues.push({
          severity: "warning",
          check: "no-reduced-motion",
          msg: `File has animations but no prefers-reduced-motion fallback. Add @media (prefers-reduced-motion: reduce) or useReducedMotion() hook. WCAG 2.1 SC 2.3.3.`,
          file: relFile,
        });
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // transition: all
      if (/transition\s*:\s*all/i.test(line) || /transition-all/i.test(line)) {
        issues.push({
          severity: "warning",
          check: "transition-all",
          msg: `transition: all animates every property (performance killer). Specify: transition: transform, opacity.`,
          file: relFile, line: i + 1,
        });
      }

      // Animating layout properties
      if (/transition[^;]*\b(width|height|top|left|margin|padding)\b/i.test(line)) {
        issues.push({
          severity: "warning",
          check: "animate-layout-prop",
          msg: `Animating layout property forces reflow (janky). Use transform: scale/translate instead.`,
          file: relFile, line: i + 1,
        });
      }

      // Animations > 500ms
      if (/(?:animation|transition)[^;]*\b(\d{3,})ms\b/i.test(line)) {
        const match = line.match(/(?:animation|transition)[^;]*\b(\d{3,})ms\b/i);
        if (match && parseInt(match[1]) > 500) {
          issues.push({
            severity: "info",
            check: "long-duration",
            msg: `Animation duration ${match[1]}ms is > 500ms. Keep UI animations under 400ms (feels slow).`,
            file: relFile, line: i + 1,
          });
        }
      }
    }
  }
}

const result = buildResult(issues);
printResult(result, "Motion Accessibility Checker");
exitFromResultGuarded(result);

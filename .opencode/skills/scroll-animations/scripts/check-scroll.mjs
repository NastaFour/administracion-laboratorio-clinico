#!/usr/bin/env node
/**
 * check-scroll.mjs
 * Detects scroll event listeners without throttle, and ScrollTrigger without cleanup.
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

      // addEventListener scroll without throttle/requestAnimationFrame
      if (/addEventListener\s*\(\s*["']scroll["']/i.test(line)) {
        if (!/throttle|debounce|requestAnimationFrame|rAF/i.test(content)) {
          issues.push({
            severity: "warning",
            check: "scroll-no-throttle",
            msg: `Scroll listener without throttle/requestAnimationFrame. This will fire on every pixel scrolled → janky. Use requestAnimationFrame or throttle.`,
            file: relFile, line: i + 1,
          });
        }
      }

      // ScrollTrigger without kill/revert
      if (/ScrollTrigger/i.test(line) && !/kill|revert|context|useGSAP/i.test(content)) {
        issues.push({
          severity: "error",
          check: "scrolltrigger-no-cleanup",
          msg: `ScrollTrigger used without cleanup (gsap.context/revert or useGSAP). Will cause memory leaks and duplicate triggers on re-renders.`,
          file: relFile, line: i + 1,
        });
      }
    }
  }
}

const result = buildResult(issues);
printResult(result, "Scroll Animations Checker");
exitFromResultGuarded(result);

#!/usr/bin/env node
/**
 * check-gsap.mjs
 * Detects GSAP usage without useGSAP/context cleanup, and ScrollTrigger without kill.
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

    if (/from\s+["']gsap["']/.test(content)) {
      // Check for cleanup
      if (!/useGSAP|gsap\.context|ctx\.revert|\.revert\(\)/.test(content)) {
        issues.push({
          severity: "error",
          check: "gsap-no-cleanup",
          msg: `GSAP used without useGSAP() or gsap.context() cleanup. Animations and ScrollTriggers will persist after unmount → memory leaks. Use: useGSAP(() => { ... }, { scope: ref }) or const ctx = gsap.context(() => { ... }); return () => ctx.revert();`,
          file: relFile,
        });
      }

      // Check for ScrollTrigger without matchMedia (reduced motion)
      if (/ScrollTrigger/.test(content) && !/matchMedia|prefers-reduced-motion/.test(content)) {
        issues.push({
          severity: "warning",
          check: "gsap-no-reduced-motion",
          msg: `ScrollTrigger used without gsap.matchMedia() for prefers-reduced-motion. Add matchMedia to disable animations for users who prefer reduced motion.`,
          file: relFile,
        });
      }
    }
  }
}

const result = buildResult(issues);
printResult(result, "GSAP Checker");
exitFromResultGuarded(result);

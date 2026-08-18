#!/usr/bin/env node
/**
 * check-transitions.mjs
 * Detects route changes without AnimatePresence, and transitions > 500ms.
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

    // Check if file uses Routes (React Router)
    if (/useLocation|<Routes/.test(content) && !/AnimatePresence/.test(content)) {
      issues.push({
        severity: "info",
        check: "no-route-transition",
        msg: `React Router Routes without AnimatePresence. Route changes will be instant (jumpy). Wrap Routes in <AnimatePresence mode="wait"> with key={location.pathname}.`,
        file: relFile,
      });
    }

    // Check for transitions > 500ms
    const longDurationMatches = [...content.matchAll(/duration\s*:\s*(\d{3,})/g)];
    for (const m of longDurationMatches) {
      const val = parseInt(m[1]);
      if (val > 500) {
        const lineNum = content.substring(0, m.index).split("\n").length;
        issues.push({
          severity: "warning",
          check: "long-transition",
          msg: `Transition duration ${val}ms is too long (> 500ms feels slow). Keep page transitions under 400ms.`,
          file: relFile, line: lineNum,
        });
      }
    }
  }
}

const result = buildResult(issues);
printResult(result, "Page Transitions Checker");
exitFromResultGuarded(result);

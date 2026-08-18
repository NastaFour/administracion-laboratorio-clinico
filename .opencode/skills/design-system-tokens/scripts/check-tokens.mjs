#!/usr/bin/env node
/**
 * check-tokens.mjs
 * Detects hardcoded colors (#hex), arbitrary spacing, and magic duration numbers.
 * Usage: node check-tokens.mjs [--srcDir <path>]
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
const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
const arbitraryPxRegex = /(?:padding|margin|gap|top|bottom|left|right|width|height):\s*(\d+)px/g;
const magicDurationRegex = /transition[^;]*\b(\d{3,})ms\b/g;

for (const srcDir of srcDirs) {
  const files = walkFiles(srcDir, (name) => /\.(t|j)sx?$|\.css$/.test(name));
  for (const file of files) {
    const content = readFileUtf8(file);
    const relFile = relative(process.cwd(), file);
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip comments and CSS variable definitions
      if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) continue;

      // Hex colors (not in CSS :root or tailwind config)
      const hexMatches = [...line.matchAll(hexRegex)];
      for (const m of hexMatches) {
        // Skip if in a CSS variable definition or tailwind config
        if (/--color/.test(line) || /theme|colors/.test(line)) continue;
        issues.push({
          severity: "warning",
          check: "hardcoded-hex",
          msg: `Hardcoded hex color "${m[0]}" — use var(--color-*) token or Tailwind class instead.`,
          file: relFile, line: i + 1,
        });
      }

      // Arbitrary px in spacing (not multiples of 4)
      const pxMatches = [...line.matchAll(arbitraryPxRegex)];
      for (const m of pxMatches) {
        const val = parseInt(m[1]);
        if (val % 4 !== 0 && val > 0) {
          issues.push({
            severity: "warning",
            check: "non-8pt-spacing",
            msg: `Spacing ${val}px is not a multiple of 4 (8pt system). Use token or Tailwind spacing class.`,
            file: relFile, line: i + 1,
          });
        }
      }

      // Magic duration numbers (not in token definition)
      const durMatches = [...line.matchAll(magicDurationRegex)];
      for (const m of durMatches) {
        const val = parseInt(m[1]);
        if (![75, 150, 250, 400, 600, 1000].includes(val) && !/--duration/.test(line)) {
          issues.push({
            severity: "info",
            check: "magic-duration",
            msg: `Duration ${val}ms is not a token value (75/150/250/400/600/1000). Use --duration-* token.`,
            file: relFile, line: i + 1,
          });
        }
      }
    }
  }
}

const result = buildResult(issues);
printResult(result, "Design Tokens Checker");
exitFromResultGuarded(result);

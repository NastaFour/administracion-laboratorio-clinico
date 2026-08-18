#!/usr/bin/env node
/**
 * validate-build-config.mjs
 *
 * Checks that build config files exist and are correct.
 * Usage:
 *   node validate-build-config.mjs [--webDir <path>] [--fix]
 *
 * Exit codes: 0 = pass, 1 = errors found
 */

import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildResult, printResult, exitFromResult, exitFromResultGuarded, findProjectRoot } from "../../_shared/script-utils.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Parse args
const args = process.argv.slice(2);
let webDir = null;
let fix = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--webDir" && args[i + 1]) { webDir = resolve(args[++i]); }
  else if (args[i] === "--fix") { fix = true; }
}

const root = findProjectRoot(__dirname);
if (!webDir) {
  webDir = root ? join(root, "apps", "web") : resolve(process.cwd(), "apps", "web");
}

/** @type {import("../_shared/script-utils.mjs").ScriptResult extends { issues: infer I } ? I : never} */
const issues = [];

// --- Check 1: postcss.config exists with tailwindcss + autoprefixer ---
const postcssVariants = ["postcss.config.js", "postcss.config.cjs", "postcss.config.mjs"];
let postcssFile = null;
for (const v of postcssVariants) {
  const p = join(webDir, v);
  if (existsSync(p)) { postcssFile = p; break; }
}
if (!postcssFile) {
  issues.push({
    severity: "error",
    check: "postcss-missing",
    msg: `postcss.config.js not found in ${webDir}. Tailwind @tailwind directives will NOT be processed → CSS appears as plain text. Fix: create postcss.config.js with { plugins: { tailwindcss: {}, autoprefixer: {} } }${fix ? " (--fix will create it)" : ""}`,
    file: webDir,
  });
  if (fix) {
    const template = `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};\n`;
    writeFileSync(join(webDir, "postcss.config.js"), template, "utf8");
    issues.push({ severity: "info", check: "postcss-fixed", msg: "Created postcss.config.js with tailwindcss + autoprefixer plugins", file: join(webDir, "postcss.config.js") });
  }
} else {
  const content = readFileSync(postcssFile, "utf8");
  if (!content.includes("tailwindcss")) {
    issues.push({ severity: "error", check: "postcss-no-tailwind", msg: `postcss config at ${postcssFile} does not include 'tailwindcss' plugin. @tailwind directives won't process.`, file: postcssFile });
  }
  if (!content.includes("autoprefixer")) {
    issues.push({ severity: "warning", check: "postcss-no-autoprefixer", msg: `postcss config at ${postcssFile} does not include 'autoprefixer'. Some vendor prefixes may be missing.`, file: postcssFile });
  }
}

// --- Check 2: tailwind.config exists with DEFAULT shades ---
const tailwindVariants = ["tailwind.config.js", "tailwind.config.cjs", "tailwind.config.ts"];
let tailwindFile = null;
for (const v of tailwindVariants) {
  const p = join(webDir, v);
  if (existsSync(p)) { tailwindFile = p; break; }
}
if (!tailwindFile) {
  issues.push({
    severity: "error",
    check: "tailwind-missing",
    msg: `tailwind.config.{js,cjs,ts} not found in ${webDir}. Utility classes like bg-primary won't resolve. Fix: create tailwind.config.js with theme.extend.colors containing palettes with DEFAULT shades.`,
    file: webDir,
  });
} else {
  const content = readFileSync(tailwindFile, "utf8");
  // Look for color palette names used as bg-<name> or text-<name> without DEFAULT
  const paletteMatches = content.matchAll(/(\w+):\s*\{\s*(?:DEFAULT\s*:|[\d]+\s*:)/g);
  const palettes = new Set();
  for (const m of paletteMatches) palettes.add(m[1]);
  // Heuristic: if "primary" appears in content but "DEFAULT" doesn't appear near it
  if (content.includes("primary") && !content.match(/primary:\s*\{[\s\S]*?DEFAULT/s)) {
    issues.push({
      severity: "error",
      check: "tailwind-no-default",
      msg: `tailwind config at ${tailwindFile} has 'primary' palette but no 'DEFAULT' shade. bg-primary / text-primary won't apply color. Fix: add DEFAULT: "#0ea5e9" to the primary object.`,
      file: tailwindFile,
    });
  }
  // Check border color variable
  if (content.includes("border") && !content.match(/border\s*:/) && !content.includes("borderColor")) {
    issues.push({
      severity: "warning",
      check: "tailwind-no-border-var",
      msg: `tailwind config may be missing 'border' color variable. If using border-primary or similar, ensure border color is defined.`,
      file: tailwindFile,
    });
  }
}

// --- Check 3: vite.config exists ---
const viteVariants = ["vite.config.ts", "vite.config.js", "vite.config.mts"];
let viteFile = null;
for (const v of viteVariants) {
  const p = join(webDir, v);
  if (existsSync(p)) { viteFile = p; break; }
}
if (!viteFile) {
  issues.push({
    severity: "error",
    check: "vite-missing",
    msg: `vite.config.{ts,js} not found in ${webDir}. Vite won't start without it.`,
    file: webDir,
  });
} else {
  const content = readFileSync(viteFile, "utf8");
  if (!content.includes("@vitejs/plugin-react") && !content.includes("plugin-react")) {
    issues.push({ severity: "warning", check: "vite-no-react-plugin", msg: `vite config at ${viteFile} may be missing @vitejs/plugin-react. React Fast Refresh won't work.`, file: viteFile });
  }
}

// --- Check 4: tsconfig.base.json exists with strict ---
const tsconfigBase = root ? join(root, "tsconfig.base.json") : join(webDir, "tsconfig.base.json");
if (!existsSync(tsconfigBase)) {
  issues.push({ severity: "warning", check: "tsconfig-base-missing", msg: `tsconfig.base.json not found at ${tsconfigBase}. Shared TS config missing.`, file: tsconfigBase });
} else {
  const content = readFileSync(tsconfigBase, "utf8");
  if (!content.includes('"strict"') || !content.match(/"strict"\s*:\s*true/)) {
    issues.push({ severity: "warning", check: "tsconfig-not-strict", msg: `tsconfig.base.json at ${tsconfigBase} does not have "strict": true. AGENTS.md rule violation.`, file: tsconfigBase });
  }
}

const result = buildResult(issues);
printResult(result, "Build Config Validator");
exitFromResultGuarded(result);

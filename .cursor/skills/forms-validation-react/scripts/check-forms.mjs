#!/usr/bin/env node
/**
 * check-forms.mjs
 *
 * Detects forms without zodResolver or with inline Zod schemas
 * (not imported from shared-types).
 *
 * Usage:
 *   node check-forms.mjs [--srcDir <path>]
 *
 * Exit codes: 0 = OK, 1 = non-compliant form found
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
  if (root) {
    srcDirs = [join(root, "apps", "web", "src"), join(root, "apps", "mobile-client", "src")];
  } else {
    srcDirs = [resolve(process.cwd(), "apps/web/src")];
  }
}

const issues = [];

for (const srcDir of srcDirs) {
  const srcFiles = walkFiles(srcDir, (name) => /\.(t|j)sx?$/.test(name));

  for (const file of srcFiles) {
    const content = readFileUtf8(file);
    const relFile = relative(process.cwd(), file);

    // Find useForm calls
    if (/useForm\s*\(/.test(content)) {
      // Check if zodResolver is used
      if (!/zodResolver/.test(content)) {
        issues.push({
          severity: "warning",
          check: "form-no-zod-resolver",
          msg: `useForm() without zodResolver. Form validation is unstructured. Add resolver: zodResolver(schema) from @hookform/resolvers/zod.`,
          file: relFile,
        });
      }

      // Check for inline z.object (schema defined inline, not imported)
      const inlineSchema = content.match(/resolver:\s*zodResolver\s*\(\s*z\.object/);
      if (inlineSchema) {
        issues.push({
          severity: "warning",
          check: "inline-schema",
          msg: `Inline Zod schema in form. Move schema to packages/shared-types/src/schemas/ and import it. Inline schemas lead to duplicated validation between web, mobile, and API.`,
          file: relFile,
        });
      }
    }
  }
}

const result = buildResult(issues);
printResult(result, "Forms Validation Checker");
exitFromResultGuarded(result);

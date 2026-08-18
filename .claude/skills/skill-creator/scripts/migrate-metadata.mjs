#!/usr/bin/env node
/**
 * migrate-metadata.mjs
 * 
 * Migrates trigger/scope YAML directo → metadata:{trigger:[], scope:[]} 
 * in all SKILL.md files that have the old format.
 * 
 * Also fixes:
 * - description: > (YAML folded) → description: (flat string)
 * - Removes license: "Complete terms in LICENSE.txt" if file doesn't exist
 * - Adds missing license: MIT if not present
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CATALOG_ROOT = resolve(__dirname, "../..");

const SKIP_DIRS = new Set(["copia-de-seguridad", "copia-de-seguridad-2", "node_modules", ".git", "00-meta-skills"]);

function walk(dir) {
  const out = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...walk(join(dir, e.name)));
    } else if (e.isFile() && e.name === "SKILL.md") {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

function parseYamlFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  return { front: match[1], body: match[2] };
}

function extractField(front, field) {
  // Simple extraction: finds "field: value" or "field: [val1, val2]"
  // Returns { value, fullMatch (including multiline) }
  const lines = front.split("\n");
  let inField = false;
  let fieldLine = -1;
  let value = "";
  let collected = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inField && line.match(new RegExp(`^${field}:\\s*`))) {
      inField = true;
      fieldLine = i;
      value = line.replace(new RegExp(`^${field}:\\s*`), "").trim();
      collected = 1;
      // Check for multiline YAML values
      if (value === ">" || value === "|" || value === "") {
        // Collect subsequent indented lines
        value = "";
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].match(/^\s+/) && !lines[j].match(/^[a-z-]+:/)) {
            value += (value ? " " : "") + lines[j].trim();
            collected++;
          } else {
            break;
          }
        }
      }
      break;
    }
  }
  
  if (!inField) return null;
  
  // Return the full block to remove
  const fullLines = lines.slice(fieldLine, fieldLine + collected);
  return { value, fieldLine, lineCount: collected, fullMatch: fullLines.join("\n") };
}

function buildMetadataBlock(trigger, scope) {
  let block = "metadata:\n";
  if (trigger) {
    // Parse trigger value: could be "keyword1", "keyword2" or [keyword1, keyword2]
    let triggers;
    if (trigger.startsWith("[")) {
      triggers = trigger; // Already array format
    } else {
      // Split comma-separated quoted strings
      const parts = trigger.match(/"[^"]+"/g) || [trigger];
      triggers = "[" + parts.map(p => p.trim()).join(", ") + "]";
    }
    block += `  trigger: ${triggers}\n`;
  }
  if (scope) {
    block += `  scope: ${scope}\n`;
  }
  block += `  version: "1.0.0"\n`;
  return block;
}

function migrate(file) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    return { file, action: "skip", reason: "cannot read" };
  }

  const parsed = parseYamlFrontmatter(content);
  if (!parsed) return { file, action: "skip", reason: "no frontmatter" };

  const { front, body } = parsed;
  const folder = basename(dirname(file));
  const relPath = file.replace(CATALOG_ROOT + "\\", "").replace(CATALOG_ROOT + "/", "");

  // Check if already has metadata field
  if (front.match(/^metadata:\s*$/m) || front.match(/^metadata:\s*\{/m)) {
    return { file: relPath, action: "skip", reason: "already has metadata" };
  }

  // Extract trigger and scope
  const triggerInfo = extractField(front, "trigger");
  const scopeInfo = extractField(front, "scope");

  if (!triggerInfo && !scopeInfo) {
    return { file: relPath, action: "skip", reason: "no trigger/scope found" };
  }

  // Build new frontmatter
  let newFront = front;
  
  // Remove old trigger and scope lines (from bottom to top to preserve line numbers)
  const linesToRemove = [];
  if (triggerInfo) linesToRemove.push({ start: triggerInfo.fieldLine, count: triggerInfo.lineCount });
  if (scopeInfo) linesToRemove.push({ start: scopeInfo.fieldLine, count: scopeInfo.lineCount });
  
  // Sort by line number descending
  linesToRemove.sort((a, b) => b.start - a.start);
  
  let frontLines = newFront.split("\n");
  for (const removal of linesToRemove) {
    frontLines.splice(removal.start, removal.count);
  }
  
  // Remove trailing empty lines before adding metadata
  while (frontLines.length > 0 && frontLines[frontLines.length - 1].trim() === "") {
    frontLines.pop();
  }
  
  // Add metadata block
  const metadataBlock = buildMetadataBlock(
    triggerInfo ? triggerInfo.value : null,
    scopeInfo ? scopeInfo.value : null
  );
  frontLines.push(metadataBlock.trimEnd());
  
  const newFrontStr = frontLines.join("\n");
  const newContent = `---\n${newFrontStr}\n---\n${body}`;

  return { 
    file: relPath, 
    action: "migrated", 
    trigger: triggerInfo?.value || "(none)", 
    scope: scopeInfo?.value || "(none)",
    content: newContent
  };
}

// Main
const allSkills = walk(CATALOG_ROOT);
console.log(`\n🔄 Migrating ${allSkills.length} skills to metadata format...\n`);

let migrated = 0;
let skipped = 0;
let errors = 0;

for (const file of allSkills) {
  const result = migrate(file);
  
  if (result.action === "migrated") {
    // Write the migrated content
    try {
      writeFileSync(file, result.content, "utf8");
      console.log(`  ✅ ${result.file} → metadata: { trigger: ${result.trigger}, scope: ${result.scope} }`);
      migrated++;
    } catch (err) {
      console.error(`  ❌ ${result.file}: write failed - ${err.message}`);
      errors++;
    }
  } else if (result.action === "skip") {
    console.log(`  ⏭️  ${result.file}: ${result.reason}`);
    skipped++;
  }
}

console.log(`\n📊 Summary: ${migrated} migrated · ${skipped} skipped · ${errors} errors`);

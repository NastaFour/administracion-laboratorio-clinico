#!/usr/bin/env node
/**
 * install-skills.mjs — Cross-tool skill installer
 *
 * Usage:
 *   node install-skills.mjs                                          # Install globally for detected tools
 *   node install-skills.mjs --target <path>                          # Install into a specific project
 *   node install-skills.mjs --target <path> --tool claude-code       # Install for one tool only
 *   node install-skills.mjs --symlink                                # Symlink instead of copy
 *   node install-skills.mjs --dry-run                                # Preview only
 *   node install-skills.mjs --only "04-backend,05-frontend"          # Filter by category
 *
 * Detects which agents are installed and creates the right folder structure for each.
 * Cross-platform: Windows uses junctions, macOS/Linux use symlinks.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  symlinkSync,
  copyFileSync,
  readFileSync,
  cpSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep, basename } from "node:path";
import { homedir, platform } from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CATALOG_ROOT = resolve(__dirname, "../../..");

const args = process.argv.slice(2);
let target = null;
let tool = null;
let useSymlink = false;
let dryRun = false;
let onlyCategories = null;
let skipDetect = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--target") target = resolve(args[++i]);
  else if (a === "--tool") tool = args[++i];
  else if (a === "--symlink") useSymlink = true;
  else if (a === "--dry-run") dryRun = true;
  else if (a === "--only") onlyCategories = args[++i].split(",").map((s) => s.trim());
  else if (a === "--all-tools") skipDetect = true;
  else if (a === "--help" || a === "-h") {
    printHelp();
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${a}`);
    process.exit(2);
  }
}

const isWindows = platform() === "win32";

const AGENT_TARGETS = [
  {
    id: "claude-code",
    name: "Claude Code",
    detect: (h) => existsSync(join(h, ".claude")) || hasBinary("claude"),
    globalInstallPath: (h) => join(h, ".claude", "skills"),
    projectInstallPath: (target) => join(target, ".claude", "skills"),
  },
  {
    id: "opencode",
    name: "OpenCode",
    detect: (h) => existsSync(join(h, ".config", "opencode")) || hasBinary("opencode"),
    globalInstallPath: (h) => join(h, ".config", "opencode", "skills"),
    projectInstallPath: (target) => join(target, ".opencode", "skills"),
  },
  {
    id: "cursor",
    name: "Cursor",
    detect: (h) => existsSync(join(h, ".cursor")),
    globalInstallPath: (h) => join(h, ".cursor", "skills"),
    projectInstallPath: (target) => join(target, ".cursor", "skills"),
  },
  {
    id: "copilot",
    name: "GitHub Copilot (VS Code)",
    detect: (h) => existsSync(join(h, ".copilot")),
    globalInstallPath: (h) => join(h, ".copilot", "skills"),
    projectInstallPath: (target) => join(target, ".copilot", "skills"),
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    detect: (h) => existsSync(join(h, ".codex")) || hasBinary("codex"),
    globalInstallPath: (h) => join(h, ".codex", "skills"),
    projectInstallPath: (target) => join(target, ".codex", "skills"),
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    detect: (h) => existsSync(join(h, ".gemini")) || hasBinary("gemini"),
    globalInstallPath: (h) => join(h, ".gemini", "skills"),
    projectInstallPath: (target) => join(target, ".gemini", "skills"),
  },
  {
    id: "antigravity",
    name: "Antigravity",
    detect: (h) => existsSync(join(h, ".gemini", "antigravity")),
    globalInstallPath: (h) => join(h, ".gemini", "antigravity", "skills"),
    projectInstallPath: (target) => join(target, ".gemini", "antigravity", "skills"),
  },
  {
    id: "kiro",
    name: "Kiro IDE",
    detect: (h) => existsSync(join(h, ".kiro")) || hasBinary("kiro"),
    globalInstallPath: (h) => join(h, ".kiro", "skills"),
    projectInstallPath: (target) => join(target, ".kiro", "skills"),
  },
  {
    id: "windsurf",
    name: "Windsurf",
    detect: (h) => existsSync(join(h, ".codeium", "windsurf")),
    globalInstallPath: (h) => join(h, ".codeium", "windsurf", "skills"),
    projectInstallPath: (target) => join(target, ".codeium", "windsurf", "skills"),
  },
  {
    id: "deepseek",
    name: "DeepSeek IDE (TUI)",
    detect: (h) => existsSync(join(h, ".deepseek")) || hasBinary("deepseek"),
    globalInstallPath: (h) => join(h, ".deepseek", "skills"),
    projectInstallPath: (target) => join(target, ".deepseek", "skills"),
  },
];

function hasBinary(name) {
  const pathSep = isWindows ? ";" : ":";
  const dirs = (process.env.PATH || "").split(pathSep);
  const exts = isWindows ? [".exe", ".cmd", ".bat", ""] : [""];
  for (const d of dirs) {
    for (const ext of exts) {
      const p = join(d, name + ext);
      try {
        if (existsSync(p) && statSync(p).isFile()) return true;
      } catch {}
    }
  }
  return false;
}

function printHelp() {
  console.log(`install-skills.mjs — Cross-tool skill installer

Usage:
  node install-skills.mjs [options]

Options:
  --target <path>      Install into a specific project directory (default: global install for detected tools)
  --tool <id>          Install for a specific tool only (claude-code, opencode, cursor, copilot, codex, gemini-cli, antigravity, kiro, windsurf, deepseek)
  --symlink            Use symlinks (junctions on Windows) instead of copy
  --dry-run            Preview changes without writing
  --only <list>        Comma-separated list of categories to install (e.g. "04-backend,05-frontend")
  --all-tools          Skip detection; install for all known tools
  --help, -h           Show this help

Examples:
  # Install globally for all detected tools
  node install-skills.mjs

  # Install into a project for Claude Code and Cursor only
  node install-skills.mjs --target "C:\\\\trabajos\\\\superapp" --tool claude-code --tool cursor

  # Use symlinks for live editing
  node install-skills.mjs --target "C:\\\\trabajos\\\\superapp" --symlink

  # Preview what would happen
  node install-skills.mjs --dry-run
`);
}

function collectSkills(root) {
  const skills = [];
  const skipDirs = new Set(["copia-de-seguridad", "copia-de-seguridad-2", "node_modules", ".git"]);
  function isCategoryDir(relPath) {
    if (!onlyCategories) return true;
    const topFolder = relPath.split(sep)[0];
    return onlyCategories.includes(topFolder);
  }
  function walk(dir, rel) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        if (skipDirs.has(e.name)) continue;
        const subRel = rel ? join(rel, e.name) : e.name;
        if (rel === "" && !isCategoryDir(subRel)) continue;
        walk(join(dir, e.name), subRel);
      } else if (e.isFile() && e.name === "SKILL.md") {
        skills.push(dir);
      }
    }
  }
  walk(root, "");
  return skills;
}

function copyDirSync(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = join(src, e.name);
    const d = join(dest, e.name);
    if (e.isDirectory()) {
      copyDirSync(s, d);
    } else if (e.isFile()) {
      copyFileSync(s, d);
    }
  }
}

function fixSharedImports(skillDestDir) {
  const scriptsDir = join(skillDestDir, "scripts");
  if (!existsSync(scriptsDir)) return;
  let changed = 0;
  for (const e of readdirSync(scriptsDir, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith(".mjs")) continue;
    const p = join(scriptsDir, e.name);
    const src = readFileSync(p, "utf8");
    const rewritten = src
      .split('"../../_shared/').join('"../../_shared/')
      .split("'../../_shared/").join("'../../_shared/");
    if (rewritten !== src) {
      writeFileSync(p, rewritten);
      changed++;
    }
  }
  if (changed) console.log(`  🔧 rewrote _shared imports in ${changed} script(s)`);
}

function fixCrossSkillRefs(skillDestDir) {
  const skillFile = join(skillDestDir, "SKILL.md");
  if (!existsSync(skillFile)) return;
  const src = readFileSync(skillFile, "utf8");
  const rewritten = src
    .replace(
      /\.\.\/\.\.\/\d{2}-[a-z-]+\/([a-z0-9-]+)\/SKILL\.md/g,
      "../$1/SKILL.md"
    )
    .replace(
      /\.\.\/\.\.\/professional-planner\/SKILL\.md/g,
      "../professional-planner/SKILL.md"
    );
  if (rewritten !== src) {
    writeFileSync(skillFile, rewritten);
    console.log(`  🔧 flattened cross-skill references in SKILL.md`);
  }
}

function installSkill(srcSkillDir, destSkillsDir) {
  const skillName = basename(srcSkillDir);
  const dest = join(destSkillsDir, skillName);
  if (dryRun) {
    console.log(`  [dry-run] ${srcSkillDir} -> ${dest}`);
    return;
  }
  if (existsSync(dest)) {
    try {
      const stat = statSync(dest);
      if (stat.isSymbolicLink() || stat.isDirectory()) {
        // Remove existing (symlink or directory) before installing
        rmSync(dest, { recursive: true, force: true });
      }
    } catch {}
  }
  if (useSymlink) {
    try {
      symlinkSync(srcSkillDir, dest, isWindows ? "junction" : "dir");
      console.log(`  ✅ symlink: ${skillName}`);
    } catch (err) {
      console.warn(`  ⚠️  symlink failed for ${skillName}, falling back to copy: ${err.message}`);
      copyDirSync(srcSkillDir, dest);
      fixSharedImports(dest);
      fixCrossSkillRefs(dest);
      console.log(`  ✅ copied: ${skillName}`);
    }
  } else {
    copyDirSync(srcSkillDir, dest);
    fixSharedImports(dest);
    fixCrossSkillRefs(dest);
    console.log(`  ✅ copied: ${skillName}`);
    // Surface non-standard files copied (LICENSE.txt, references/, assets/)
    // so a human can confirm they survive the install. Silent otherwise.
    const hasLicense = existsSync(join(srcSkillDir, "LICENSE.txt"));
    const hasRefs = existsSync(join(srcSkillDir, "references"));
    const hasAssets = existsSync(join(srcSkillDir, "assets"));
    const extras = [];
    if (hasLicense) extras.push("LICENSE.txt");
    if (hasRefs) extras.push("references/");
    if (hasAssets) extras.push("assets/");
    if (extras.length) console.log(`     └─ carried: ${extras.join(", ")}`);
  }
}

function main() {
  console.log("📦 Skill Installer (Cross-Tool Distribution)\n");
  console.log(`Catalog: ${CATALOG_ROOT}`);
  console.log(`Platform: ${platform()}`);
  console.log(`Mode: ${useSymlink ? "symlink" : "copy"}${dryRun ? " (dry-run)" : ""}\n`);

  const home = homedir();
  const detected = skipDetect
    ? AGENT_TARGETS
    : AGENT_TARGETS.filter((t) => {
        try {
          return t.detect(home);
        } catch {
          return false;
        }
      });

  const filtered = tool ? detected.filter((t) => t.id === tool) : detected;
  if (filtered.length === 0) {
    console.log("❌ No matching tools detected.");
    if (!tool) {
      console.log("   Use --all-tools to install for all known tools.");
      console.log("   Or specify --tool <id> for a specific tool.");
    }
    process.exit(0);
  }

  console.log(`🔍 Detected ${filtered.length} tool(s): ${filtered.map((t) => t.name).join(", ")}\n`);

  const skills = collectSkills(CATALOG_ROOT);
  console.log(`📚 Found ${skills.length} skills in catalog${onlyCategories ? ` (filtered to: ${onlyCategories.join(", ")})` : ""}\n`);

  for (const agent of filtered) {
    const installPath = target ? agent.projectInstallPath(target) : agent.globalInstallPath(home);
    console.log(`\n→ ${agent.name}${target ? ` (project: ${target})` : " (global)"}`);
    console.log(`  target: ${installPath}`);

    if (!dryRun && !existsSync(dirname(installPath))) {
      try {
        mkdirSync(dirname(installPath), { recursive: true });
        console.log(`  📁 created parent: ${dirname(installPath)}`);
      } catch (err) {
        console.error(`  ❌ cannot create parent: ${err.message}`);
        continue;
      }
    }

    for (const skillDir of skills) {
      try {
        installSkill(skillDir, installPath);
      } catch (err) {
        console.error(`  ❌ ${basename(skillDir)}: ${err.message}`);
      }
    }

    if (!useSymlink) {
      const sharedSrc = join(CATALOG_ROOT, "_shared");
      if (existsSync(sharedSrc)) {
        const sharedDest = join(installPath, "_shared");
        if (dryRun) {
          console.log(`  [dry-run] _shared -> ${sharedDest}`);
        } else {
          if (existsSync(sharedDest)) rmSync(sharedDest, { recursive: true, force: true });
          copyDirSync(sharedSrc, sharedDest);
          console.log(`  ✅ copied: _shared (shared script resources)`);
        }
      }
    }
  }

  console.log(`\n✨ Done. ${dryRun ? "(dry-run, no changes written)" : "Restart your AI tools to load the new skills."}`);
}

main();

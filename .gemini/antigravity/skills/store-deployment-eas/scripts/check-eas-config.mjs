#!/usr/bin/env node
/**
 * check-eas-config.mjs
 * Verifies eas.json and app.json have required fields for store deployment.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildResult, printResult, exitFromResult, exitFromResultGuarded, findProjectRoot } from "../../_shared/script-utils.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = findProjectRoot(__dirname);
const issues = [];

const appPaths = [
  root ? join(root, "apps", "mobile-client") : null,
  root ? join(root, "apps", "mobile-barber") : null,
].filter(Boolean);

for (const appPath of appPaths) {
  const easJsonPath = join(appPath, "eas.json");
  const appJsonPath = join(appPath, "app.json");

  if (!existsSync(easJsonPath)) {
    issues.push({ severity: "warning", check: "eas-json-missing", msg: `eas.json not found in ${appPath}. Required for EAS build/submit.` });
  } else {
    const eas = JSON.parse(readFileSync(easJsonPath, "utf8"));
    if (!eas.build?.production) {
      issues.push({ severity: "error", check: "no-production-profile", msg: `eas.json in ${appPath} has no production build profile.` });
    }
    if (!eas.build?.staging) {
      issues.push({ severity: "warning", check: "no-staging-profile", msg: `eas.json in ${appPath} has no staging build profile.` });
    }
  }

  if (!existsSync(appJsonPath)) {
    issues.push({ severity: "warning", check: "app-json-missing", msg: `app.json not found in ${appPath}` });
  } else {
    const app = JSON.parse(readFileSync(appJsonPath, "utf8"));
    if (!app.expo?.version) {
      issues.push({ severity: "error", check: "no-version", msg: `app.json in ${appPath} has no expo.version. Required for store submission.` });
    }
    if (!app.expo?.updates?.url) {
      issues.push({ severity: "warning", check: "no-updates-config", msg: `No expo.updates.url in ${appPath}. OTA updates won't work.` });
    }
  }
}

const result = buildResult(issues);
printResult(result, "EAS Config Checker");
exitFromResultGuarded(result);

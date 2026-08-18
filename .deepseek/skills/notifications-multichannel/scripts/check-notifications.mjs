#!/usr/bin/env node
/**
 * check-notifications.mjs
 *
 * Detects notification calls that bypass the NotificationService
 * (e.g., direct expo.notifications, resend.emails, twilio.messages in routes).
 *
 * Usage:
 *   node check-notifications.mjs [--apiDir <path>]
 *
 * Exit codes: 0 = OK, 1 = direct provider call found
 */

import { resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { walkFiles, readFileUtf8, buildResult, printResult, exitFromResult, exitFromResultGuarded, findProjectRoot } from "../../_shared/script-utils.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const args = process.argv.slice(2);
let apiDir = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--apiDir" && args[i + 1]) apiDir = resolve(args[++i]);
}
if (!apiDir) {
  const root = findProjectRoot(__dirname);
  apiDir = root ? join(root, "apps", "api", "src") : resolve(process.cwd(), "apps/api/src");
}

const issues = [];

const srcFiles = walkFiles(apiDir, (name) => /\.(t|j)s$/.test(name));

// Direct provider calls that should go through NotificationService instead
const directCallPatterns = [
  { regex: /expo\.sendPushNotificationsAsync\s*\(/g, provider: "Expo Push", fix: "Use notificationService.send() instead" },
  { regex: /resend\.emails\.send\s*\(/g, provider: "Resend Email", fix: "Use notificationService.send() instead" },
  { regex: /client\.messages\.create\s*\(/g, provider: "Twilio SMS", fix: "Use notificationService.send() instead" },
];

for (const file of srcFiles) {
  const content = readFileUtf8(file);
  const relFile = relative(process.cwd(), file);

  // Skip the notification service itself + provider files
  if (/notification\.service|notification\.ts|providers?\//i.test(file)) continue;

  for (const pattern of directCallPatterns) {
    pattern.regex.lastIndex = 0;
    const matches = [...content.matchAll(pattern.regex)];
    for (const match of matches) {
      const lineNum = content.substring(0, match.index).split("\n").length;
      issues.push({
        severity: "warning",
        check: "direct-provider-call",
        msg: `Direct ${pattern.provider} call in route/service. ${pattern.fix}. Bypassing NotificationService loses user preference resolution, channel fallback, and notification logging.`,
        file: relFile,
        line: lineNum,
      });
    }
  }
}

const result = buildResult(issues);
printResult(result, "Notifications Checker");
exitFromResultGuarded(result);

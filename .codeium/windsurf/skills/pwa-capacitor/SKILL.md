---
name: pwa-capacitor
description: Standards for Progressive Web Apps (PWA) and Capacitor builds. Covers offline storage syncing, service worker setup, and Capacitor native hardware bridge plugins. Use when building a PWA, setting up service workers, or bridging native hardware via Capacitor.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["PWA", "capacitor", "offline", "service worker"]
  scope: [global, project]
  version: "1.0.0"
---

# 📱 PWA & Capacitor Web-Native Development

Use this skill when compiling the web client as a Progressive Web App (PWA) or packaging it as a hybrid application using Ionic Capacitor.

## 🚨 PWA & Capacitor Standards

1. **Offline Service Workers**:
   - Write standard service workers (`sw.js`) to intercept network calls and serve cached assets (HTML, CSS, JS bundles, and static icons) during network outages.
   - Cache products catalog responses locally using `IndexedDB` or `localStorage` as backup caches.

2. **Offline Data Syncing**:
   - If the user compiles a grocery cart while offline, store the item selections in local indexed storage.
   - Run a sync task using the service worker or Capacitor's Background Runner to push order checks to the Express server once network availability returns.

3. **Capacitor Plugins Security**:
   - Only call native device features (Camera for receipt scanning, Geolocation for shipping addresses) through official `@capacitor/` plugins (e.g. `@capacitor/geolocation`, `@capacitor/camera`).
   - Check device permission status before requesting access:
     ```typescript
     import { Geolocation } from '@capacitor/geolocation';
     
     const checkPermission = async () => {
       const status = await Geolocation.checkPermissions();
       if (status.location !== 'granted') {
         await Geolocation.requestPermissions();
       }
     };
     ```

## 🛒 [APP] Integration
- **Hybrid Delivery App Option**: In case delivery drivers prefer running the app in a mobile browser, provide PWA prompts to "Add to Home Screen".
- **Asset Optimization**: Cache grocery category icons so that categories render instantly when the driver opens the order list.
- **Offline Inventory Checks**: Store local catalog prices in memory, but show a badge indicating "Prices may not be up to date - Offline Mode".

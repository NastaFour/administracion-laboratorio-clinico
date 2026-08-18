---
name: nextjs
description: DEPRECATED. Use nextjs-15 instead. Legacy Next.js guidelines kept for retrocompatibility of projects that reference this skill. The skill-router ignores this skill.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
deprecated: true
redirect: nextjs-15
metadata:
  trigger: ["nextjs legacy", "next.js deprecated"]
  scope: [global, project]
  version: "1.0.0"
---

# 🌐 Next.js Development (App Router & Server Integration)

Use this skill when building client-facing web applications or customer-support landing pages utilizing Next.js (App Router).

## 🚨 Architectural Standards

1. **Server Components by Default**:
   - All page components must be React Server Components (RSC) to reduce client bundle size and optimize initial load performance.
   - Use `'use client'` only at the leaf nodes (forms, interactive buttons, or components importing socket.io clients).

2. **Data Fetching and Server Actions**:
   - Fetch data directly in Server Components using native `fetch` (which supports request deduplication and caching by default).
   - Use Server Actions for mutations (e.g. submitting a new support ticket or confirming an order check out). Secure them by validating session tokens.

3. **Routing Integrity**:
   - Utilize standard App Router structure (`app/page.tsx`, `app/orders/[id]/page.tsx`).
   - Implement type-safe link components (`next/link`) to avoid routing syntax failures.

## 📈 SEO & Performance Guardrails

1. **Title and Meta Tags**:
   - Every page component must declare static or dynamic `metadata` to ensure high search ranking:
     ```typescript
     import { Metadata } from 'next';
     
     export const metadata: Metadata = {
       title: '[APP] QuickOrder - Fresh Groceries Delivered',
       description: 'Order your fresh groceries in minutes and track your delivery in real-time.',
     };
     ```

2. **Semantic HTML**:
   - Use proper HTML5 semantic elements (`<main>`, `<header>`, `<footer>`, `<section>`, `<article>`) to build accessible layout structures.
   - All interactive elements must have unique, descriptive IDs for validation testing.

3. **Optimized Assets**:
   - Never use the raw HTML `<img>` tag. Use `next/image` to automatically resize, optimize formats, and lazy-load grocery images.

## 🛒 [APP] Context
- **SEO Landing Pages**: Prioritize fast SSR load times for landing pages showcasing daily grocery deals.
- **Support Form Route**: The client form should be a Client Component (`'use client'`) importing form schemas and sending submissions to the backend server via validated actions or APIs.

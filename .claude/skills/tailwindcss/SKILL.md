---
name: tailwindcss
description: Standards and guidelines for Tailwind CSS styling. Prevents runtime CSS string interpolation issues, organizes responsive layouts, and ensures clean utility classes compilation. Use when styling with Tailwind, configuring JIT, or building responsive layouts.
license: MIT
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Node 20+ and pnpm 9+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["tailwind", "CSS", "glassmorphism", "responsive", "estilos"]
  scope: [global, project]
  version: "1.0.0"
---

# 🎨 Tailwind CSS Design Guidelines

Use this skill when styling React, Next.js, or React Native (via Tailwind/NativeWind) components. Enforces clean utility usage and avoids compiling issues.

## 🚨 Tailwind CSS Guardrails

1. **Zero String Interpolation in ClassNames**:
   - Queda prohibido inyectar clases Tailwind de manera dinámica interpolando strings (ej: `className={`bg-${color}-500`}`). El compilador estático (JIT) eliminará estas clases del bundle final.
   - **Forma Correcta**: Mapear los valores a nombres de clases completos:
     ```typescript
     const statusColors = {
       PENDING: 'bg-yellow-500 text-yellow-950',
       PACKING: 'bg-blue-500 text-blue-950',
       SHIPPED: 'bg-purple-500 text-purple-950',
       DELIVERED: 'bg-green-500 text-green-950',
       CANCELLED: 'bg-red-500 text-red-950',
     };
     const colorClasses = statusColors[orderStatus];
     ```

2. **Clean Component Layouts**:
   - Limit class listings by separating complex blocks into modular sub-components. Do not write a single line of 150 utility classes.
   - Use `@apply` directives inside `index.css` sparingly and ONLY when extracting repetitive layout blocks (like global buttons or standard form inputs). Prefer standard utility-first inline patterns.

3. **Responsive Grid & Flexboxes**:
   - Use Tailwind's screen breakpoints (`sm:`, `md:`, `lg:`, `xl:`) systematically.
   - Design with mobile-first layout systems (e.g. mobile app has a simple vertical catalog layout, while admin dashboard has a multi-column grid layout).

## 🛒 [APP] Dashboard Layouts (Admin Web UI)

- **Grid Skeletons**: The layout must structure dashboards with:
  ```html
  <div class="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
    <!-- Active Orders, Out-of-Stock Alert, Total Sales, Courier maps -->
  </div>
  ```
- **Live Inventory Cards**: Cards representing products must visually indicate shortages with bright warning borders (`border-amber-500` or `border-red-500` for 0 stock) and disable packing check-actions.
- **Support Chat Box**: Ensure flexbox configurations allow the support chat area to shrink/grow and scroll independently from the side navigation.

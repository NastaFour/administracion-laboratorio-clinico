---
name: tailwind-4
description: Tailwind CSS 4 patterns — cn() utility, semantic theme classes (never var() or hex in className), style constants for chart libraries, responsive/dark-mode patterns. Use when styling with Tailwind 4 so the AI avoids the className-as-inline-CSS anti-pattern.
license: Apache-2.0
compatibility: "Compatible with Claude Code, OpenCode, Cursor, Copilot, Codex. Requires Tailwind CSS 4+, Node 20+."
allowed-tools: Bash(node:*) Read
metadata:
  trigger: ["tailwind 4", "tailwind css 4", "cn utility", "clsx twmerge", "dark mode", "responsive", "theme variables"]
  scope: [global, project]
  version: "1.1.0"
---

# Tailwind CSS 4

> [!IMPORTANT]
> Consult [_shared/references/docs-cache/tailwind-4.md](../../_shared/references/docs-cache/tailwind-4.md) before querying Context7

## Styling Decision Tree

```
Tailwind class exists?  → className="..."
Dynamic value?          → style={{ width: `${x}%` }}
Conditional styles?     → cn("base", condition && "variant")
Static only?            → className="..." (no cn() needed)
Library can't use class?→ style prop with var() constants
```

## Critical Rules

### Never Use var() in className

```typescript
// ❌ NEVER: var() in className
<div className="bg-[var(--color-primary)]" />
// ✅ ALWAYS: Use Tailwind semantic classes
<div className="bg-primary" />
```

### Never Use Hex Colors

```typescript
// ❌ NEVER: Hex colors in className
<p className="text-[#ffffff]" />
// ✅ ALWAYS: Use Tailwind color classes
<p className="text-white" />
```

## The cn() Utility

```typescript
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

### When to Use cn()

```typescript
// ✅ Conditional classes
<div className={cn("base-class", isActive && "active-class")} />
// ✅ Merging with potential conflicts
<button className={cn("px-4 py-2", className)} />
// ✅ Multiple conditions
<div className={cn(
  "rounded-lg border",
  variant === "primary" && "bg-blue-500 text-white",
  variant === "secondary" && "bg-gray-200 text-gray-800",
  disabled && "opacity-50 cursor-not-allowed"
)} />
```

### When NOT to Use cn()

```typescript
// ❌ Static classes - unnecessary wrapper
<div className={cn("flex items-center gap-2")} />
// ✅ Just use className directly
<div className="flex items-center gap-2" />
```

## Style Constants for Charts/Libraries

When libraries don't accept className (like Recharts):

```typescript
// ✅ Constants with var() - ONLY for library props
const CHART_COLORS = {
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  text: "var(--color-text)",
  gridLine: "var(--color-border)",
};
<XAxis tick={{ fill: CHART_COLORS.text }} />
<CartesianGrid stroke={CHART_COLORS.gridLine} />
```

## Dynamic Values

```typescript
// ✅ style prop for truly dynamic values
<div style={{ width: `${percentage}%` }} />
// ✅ CSS custom properties for theming
<div style={{ "--progress": `${value}%` } as React.CSSProperties} />
```

## Common Patterns

### Flexbox & Grid

```typescript
<div className="flex items-center justify-between gap-4" />
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" />
```

### States & Responsive

```typescript
<button className="hover:bg-blue-600 focus:ring-2 active:scale-95" />
<div className="w-full md:w-1/2 lg:w-1/3 hidden md:block" />
```

### Dark Mode

```typescript
<div className="bg-white dark:bg-slate-900" />
<p className="text-gray-900 dark:text-white" />
```

## Arbitrary Values (Escape Hatch)

```typescript
// ✅ OK for one-off values not in design system
<div className="w-[327px]" />
<div className="grid-cols-[1fr_2fr_1fr]" />
// ❌ Don't use for colors - use theme instead
<div className="bg-[#1e293b]" />  // NO
```

## Keywords
tailwind, css, styling, cn, utility classes, responsive
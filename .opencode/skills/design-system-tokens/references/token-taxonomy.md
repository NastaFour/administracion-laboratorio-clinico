# Token Taxonomy

## Complete Token Categories

### 1. Color Tokens

```css
:root {
  /* Primitive scales (50 = lightest, 950 = darkest) */
  --color-primary-50: hsl(199 89% 96%);
  --color-primary-100: hsl(199 89% 90%);
  --color-primary-200: hsl(199 89% 80%);
  --color-primary-300: hsl(199 89% 70%);
  --color-primary-400: hsl(199 89% 60%);
  --color-primary-500: hsl(199 89% 48%);  /* DEFAULT */
  --color-primary-600: hsl(199 89% 40%);
  --color-primary-700: hsl(199 89% 32%);
  --color-primary-800: hsl(199 89% 24%);
  --color-primary-900: hsl(199 89% 16%);
  --color-primary-950: hsl(199 89% 8%);

  /* Semantic tokens (reference primitives) */
  --color-bg: var(--color-neutral-950);
  --color-surface: var(--color-neutral-900);
  --color-surface-elevated: var(--color-neutral-800);
  --color-text-primary: var(--color-neutral-50);
  --color-text-secondary: var(--color-neutral-400);
  --color-text-muted: var(--color-neutral-500);
  --color-border: var(--color-neutral-800);
  --color-accent: var(--color-primary-500);
  --color-success: var(--color-green-500);
  --color-warning: var(--color-amber-500);
  --color-danger: var(--color-red-500);
}
```

### 2. Typography Tokens

```css
:root {
  /* Font families */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-display: "Outfit", "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Font sizes (modular scale, 1.25 ratio) */
  --text-xs: 0.64rem;    /* 10px */
  --text-sm: 0.8rem;     /* 13px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.25rem;    /* 20px */
  --text-xl: 1.563rem;   /* 25px */
  --text-2xl: 1.953rem;  /* 31px */
  --text-3xl: 2.441rem;  /* 39px */
  --text-4xl: 3.052rem;  /* 49px */
  --text-5xl: 3.815rem;  /* 61px */

  /* Font weights */
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* Line heights */
  --leading-tight: 1.1;
  --leading-snug: 1.3;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;

  /* Letter spacing */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.02em;
  --tracking-wider: 0.05em;
}
```

### 3. Spacing Tokens (8pt System)

```css
:root {
  /* Base unit: 4px (0.25rem). All spacing multiples of 4. */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.5rem;    /* 24px */
  --space-6: 2rem;      /* 32px */
  --space-8: 3rem;      /* 48px */
  --space-10: 4rem;     /* 64px */
  --space-12: 6rem;     /* 96px */
  --space-16: 8rem;     /* 128px */
}
```

### 4. Border Radius Tokens

```css
:root {
  --radius-sm: 0.375rem;   /* 6px */
  --radius-md: 0.5rem;     /* 8px */
  --radius-lg: 0.75rem;    /* 12px */
  --radius-xl: 1rem;       /* 16px */
  --radius-2xl: 1.5rem;    /* 24px */
  --radius-full: 9999px;
}
```

### 5. Shadow / Elevation Tokens

```css
:root {
  --shadow-0: none;
  --shadow-1: 0 1px 2px hsl(0 0% 0% / 0.05);
  --shadow-2: 0 2px 4px hsl(0 0% 0% / 0.08);
  --shadow-3: 0 4px 8px hsl(0 0% 0% / 0.12);
  --shadow-4: 0 8px 16px hsl(0 0% 0% / 0.16);
  --shadow-5: 0 16px 32px hsl(0 0% 0% / 0.20);
  --shadow-glow: 0 0 24px hsl(199 89% 48% / 0.3);
}
```

### 6. Z-Index Tokens

```css
:root {
  --z-base: 0;
  --z-dropdown: 1000;
  --z-sticky: 1100;
  --z-overlay: 1200;
  --z-modal: 1300;
  --z-toast: 1400;
  --z-tooltip: 1500;
}
```

### 7. Motion Tokens

See [motion-tokens.md](motion-tokens.md) for full detail.

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-slower: 600ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

## Tailwind Integration

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "hsl(199 89% 48%)",
          50: "hsl(199 89% 96%)",
          // ... full scale
          950: "hsl(199 89% 8%)",
        },
      },
      spacing: { /* maps to --space-* tokens */ },
      borderRadius: { /* maps to --radius-* tokens */ },
      boxShadow: { /* maps to --shadow-* tokens */ },
      transitionDuration: { /* maps to --duration-* tokens */ },
      transitionTimingFunction: { /* maps to --ease-* tokens */ },
      zIndex: { /* maps to --z-* tokens */ },
    },
  },
};
```

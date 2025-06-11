# TailwindCSS Setup for Astro + Svelte

This document explains the TailwindCSS v4 setup for the frontend portal.

## Installation

```bash
bun add -D @tailwindcss/postcss tailwindcss autoprefixer
```

## Configuration Files

### 1. PostCSS Config (`postcss.config.mjs`)
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

### 2. Tailwind Config (`tailwind.config.mjs`)
```javascript
/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {},
    },
    plugins: [],
}
```

### 3. CSS Import (`src/styles/tailwind.css`)
```css
@import "tailwindcss";
```

### 4. Astro Config Integration
```javascript
// astro.config.mjs
export default defineConfig({
    // ...
    vite: {
        css: {
            postcss: './postcss.config.mjs'
        },
        // ...
    }
});
```

### 5. Import in BaseHead.astro
```astro
import '../styles/tailwind.css';
```

## Key Differences from TailwindCSS v3
- Uses `@import "tailwindcss"` instead of `@tailwind base/components/utilities`
- Requires `@tailwindcss/postcss` plugin for PostCSS integration
- Uses PostCSS configuration instead of Astro integration

## Demo Component
See `src/components/TailwindDemo.svelte` for a working example with:
- Blue button with hover effects
- Responsive padding and styling
- Conditional styling based on state
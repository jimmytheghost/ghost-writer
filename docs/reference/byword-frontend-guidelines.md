# Frontend Guidelines

> **Reference Document for AI Component Generation**  
> Use this document to ensure consistent design, spacing, typography, and behavior across all components.

---

## Table of Contents

1. [Design Tokens](#1-design-tokens)
2. [Colors](#2-colors)
3. [Typography](#3-typography)
4. [Spacing](#4-spacing)
5. [Layout & Grid](#5-layout--grid)
6. [Component Patterns](#6-component-patterns)
7. [Responsive Rules](#7-responsive-rules)
8. [Animation & Motion](#8-animation--motion)
9. [Accessibility](#9-accessibility)
10. [File Organization](#10-file-organization)

---

## 1. Design Tokens

Design tokens are the single source of truth for all visual properties.

### CSS Variables (Root)

```css
:root {
  /* Colors */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-light: #dbeafe;
  --color-secondary: #8b5cf6;
  --color-secondary-hover: #7c3aed;
  
  /* Neutrals */
  --color-white: #ffffff;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  --color-black: #000000;
  
  /* Semantic Colors */
  --color-success: #10b981;
  --color-success-light: #d1fae5;
  --color-warning: #f59e0b;
  --color-warning-light: #fef3c7;
  --color-error: #ef4444;
  --color-error-light: #fee2e2;
  --color-info: #3b82f6;
  --color-info-light: #dbeafe;
  
  /* Typography */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  
  /* Font Sizes */
  --font-size-xs: 0.75rem;      /* 12px */
  --font-size-sm: 0.875rem;     /* 14px */
  --font-size-base: 1rem;       /* 16px */
  --font-size-lg: 1.125rem;     /* 18px */
  --font-size-xl: 1.25rem;      /* 20px */
  --font-size-2xl: 1.5rem;      /* 24px */
  --font-size-3xl: 1.875rem;    /* 30px */
  --font-size-4xl: 2.25rem;     /* 36px */
  --font-size-5xl: 3rem;        /* 48px */
  
  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  /* Line Heights */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* Letter Spacing */
  --letter-spacing-tight: -0.025em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.025em;
  
  /* Spacing Scale */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
  
  /* Border Radius */
  --radius-none: 0;
  --radius-sm: 0.125rem;   /* 2px */
  --radius-md: 0.25rem;    /* 4px */
  --radius-lg: 0.5rem;     /* 8px */
  --radius-xl: 0.75rem;    /* 12px */
  --radius-2xl: 1rem;      /* 16px */
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  --shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
  
  /* Z-Index Scale */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
}
```

---

## 2. Colors

### Primary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#3b82f6` | Primary buttons, links, active states |
| `--color-primary-hover` | `#2563eb` | Primary hover states |
| `--color-primary-light` | `#dbeafe` | Primary backgrounds, badges |
| `--color-secondary` | `#8b5cf6` | Secondary actions, accents |
| `--color-secondary-hover` | `#7c3aed` | Secondary hover states |

### Neutral Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-white` | `#ffffff` | Backgrounds, text on dark |
| `--color-gray-50` | `#f9fafb` | Page backgrounds |
| `--color-gray-100` | `#f3f4f6` | Card backgrounds, borders |
| `--color-gray-200` | `#e5e7eb` | Borders, dividers |
| `--color-gray-300` | `#d1d5db` | Disabled states, placeholders |
| `--color-gray-400` | `#9ca3af` | Secondary text, icons |
| `--color-gray-500` | `#6b7280` | Muted text |
| `--color-gray-600` | `#4b5563` | Body text |
| `--color-gray-700` | `#374151` | Headings |
| `--color-gray-800` | `#1f2937` | Strong text |
| `--color-gray-900` | `#111827` | Headings on light bg |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-success` | `#10b981` | Success states, confirmations |
| `--color-success-light` | `#d1fae5` | Success backgrounds |
| `--color-warning` | `#f59e0b` | Warnings, cautions |
| `--color-warning-light` | `#fef3c7` | Warning backgrounds |
| `--color-error` | `#ef4444` | Errors, deletions |
| `--color-error-light` | `#fee2e2` | Error backgrounds |
| `--color-info` | `#3b82f6` | Information, tips |
| `--color-info-light` | `#dbeafe` | Info backgrounds |

### Color Usage Patterns

```css
/* Text Colors */
.text-primary { color: var(--color-gray-900); }
.text-secondary { color: var(--color-gray-600); }
.text-muted { color: var(--color-gray-500); }
.text-disabled { color: var(--color-gray-400); }

/* Background Colors */
.bg-page { background-color: var(--color-gray-50); }
.bg-surface { background-color: var(--color-white); }
.bg-muted { background-color: var(--color-gray-100); }

/* Border Colors */
.border-default { border-color: var(--color-gray-200); }
.border-strong { border-color: var(--color-gray-300); }
```

---

## 3. Typography

### Font Families

- **Primary**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **Monospace**: `'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace`

### Type Scale

| Style | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `display` | 3rem (48px) | 700 | 1.1 | -0.025em | Hero headlines |
| `h1` | 2.25rem (36px) | 700 | 1.2 | -0.025em | Page titles |
| `h2` | 1.875rem (30px) | 600 | 1.25 | -0.025em | Section headings |
| `h3` | 1.5rem (24px) | 600 | 1.3 | 0 | Subsection headings |
| `h4` | 1.25rem (20px) | 600 | 1.4 | 0 | Card titles |
| `h5` | 1.125rem (18px) | 600 | 1.4 | 0 | Small headings |
| `h6` | 1rem (16px) | 600 | 1.5 | 0 | Labels, captions |
| `body-lg` | 1.125rem (18px) | 400 | 1.6 | 0 | Lead paragraphs |
| `body` | 1rem (16px) | 400 | 1.5 | 0 | Default body text |
| `body-sm` | 0.875rem (14px) | 400 | 1.5 | 0 | Secondary text |
| `caption` | 0.75rem (12px) | 400 | 1.5 | 0.025em | Captions, metadata |

### Typography Patterns

```css
/* Headings */
.heading-display { font-size: var(--font-size-5xl); font-weight: var(--font-weight-bold); line-height: var(--line-height-tight); letter-spacing: var(--letter-spacing-tight); }
.heading-1 { font-size: var(--font-size-4xl); font-weight: var(--font-weight-bold); line-height: 1.2; letter-spacing: var(--letter-spacing-tight); }
.heading-2 { font-size: var(--font-size-3xl); font-weight: var(--font-weight-semibold); line-height: 1.25; letter-spacing: var(--letter-spacing-tight); }
.heading-3 { font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold); line-height: 1.3; }
.heading-4 { font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); line-height: 1.4; }
.heading-5 { font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); line-height: 1.4; }
.heading-6 { font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); line-height: 1.5; }

/* Body Text */
.text-body-lg { font-size: var(--font-size-lg); line-height: 1.6; }
.text-body { font-size: var(--font-size-base); line-height: var(--line-height-normal); }
.text-body-sm { font-size: var(--font-size-sm); line-height: var(--line-height-normal); }
.text-caption { font-size: var(--font-size-xs); line-height: var(--line-height-normal); letter-spacing: var(--letter-spacing-wide); }

/* Text Utilities */
.text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.text-line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.text-line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
```

---

## 4. Spacing

### Spacing Scale

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `--space-1` | 0.25rem | 4px | Tight gaps, icon margins |
| `--space-2` | 0.5rem | 8px | Inline spacing, small gaps |
| `--space-3` | 0.75rem | 12px | Button padding, form gaps |
| `--space-4` | 1rem | 16px | Default padding, card gaps |
| `--space-5` | 1.25rem | 20px | Medium padding |
| `--space-6` | 1.5rem | 24px | Section padding |
| `--space-8` | 2rem | 32px | Large gaps, section margins |
| `--space-10` | 2.5rem | 40px | Container padding |
| `--space-12` | 3rem | 48px | Large section spacing |
| `--space-16` | 4rem | 64px | Section vertical spacing |
| `--space-20` | 5rem | 80px | Major section breaks |
| `--space-24` | 6rem | 96px | Hero spacing |

### Spacing Patterns

```css
/* Component Padding */
.padding-xs { padding: var(--space-2); }
.padding-sm { padding: var(--space-3); }
.padding-md { padding: var(--space-4); }
.padding-lg { padding: var(--space-6); }
.padding-xl { padding: var(--space-8); }

/* Component Gap */
.gap-xs { gap: var(--space-1); }
.gap-sm { gap: var(--space-2); }
.gap-md { gap: var(--space-4); }
.gap-lg { gap: var(--space-6); }
.gap-xl { gap: var(--space-8); }

/* Section Spacing */
.section-sm { padding-top: var(--space-12); padding-bottom: var(--space-12); }
.section-md { padding-top: var(--space-16); padding-bottom: var(--space-16); }
.section-lg { padding-top: var(--space-20); padding-bottom: var(--space-20); }
.section-xl { padding-top: var(--space-24); padding-bottom: var(--space-24); }

/* Content Spacing */
.stack-xs > * + * { margin-top: var(--space-1); }
.stack-sm > * + * { margin-top: var(--space-2); }
.stack-md > * + * { margin-top: var(--space-4); }
.stack-lg > * + * { margin-top: var(--space-6); }
.stack-xl > * + * { margin-top: var(--space-8); }
```

---

## 5. Layout & Grid

### Container

```css
.container {
  width: 100%;
  max-width: 1280px;
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--space-4);
  padding-right: var(--space-4);
}

@media (min-width: 640px) {
  .container {
    padding-left: var(--space-6);
    padding-right: var(--space-6);
  }
}

@media (min-width: 1024px) {
  .container {
    padding-left: var(--space-8);
    padding-right: var(--space-8);
  }
}
```

### Grid System

```css
/* 12-Column Grid */
.grid { display: grid; gap: var(--space-4); }
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }

/* Responsive Grid */
@media (min-width: 640px) {
  .sm\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sm\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (min-width: 768px) {
  .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .md\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .lg\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .lg\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
}
```

### Flexbox Patterns

```css
/* Flex Row */
.flex { display: flex; }
.flex-row { flex-direction: row; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }
.flex-nowrap { flex-wrap: nowrap; }

/* Alignment */
.items-start { align-items: flex-start; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }
.justify-start { justify-content: flex-start; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }

/* Flex Grow */
.flex-1 { flex: 1 1 0%; }
.flex-auto { flex: 1 1 auto; }
.flex-none { flex: none; }
.flex-shrink-0 { flex-shrink: 0; }
.flex-grow { flex-grow: 1; }
```

---

## 6. Component Patterns

### Buttons

```css
/* Base Button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-tight);
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

/* Button Variants */
.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-white);
}
.btn-primary:hover {
  background-color: var(--color-primary-hover);
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: var(--color-white);
}
.btn-secondary:hover {
  background-color: var(--color-secondary-hover);
}

.btn-outline {
  background-color: transparent;
  border-color: var(--color-gray-300);
  color: var(--color-gray-700);
}
.btn-outline:hover {
  background-color: var(--color-gray-50);
  border-color: var(--color-gray-400);
}

.btn-ghost {
  background-color: transparent;
  color: var(--color-gray-700);
}
.btn-ghost:hover {
  background-color: var(--color-gray-100);
}

/* Button Sizes */
.btn-sm { padding: var(--space-2) var(--space-3); font-size: var(--font-size-xs); }
.btn-md { padding: var(--space-3) var(--space-5); font-size: var(--font-size-sm); }
.btn-lg { padding: var(--space-4) var(--space-6); font-size: var(--font-size-base); }

/* Button States */
.btn:disabled,
.btn[aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

### Cards

```css
/* Base Card */
.card {
  background-color: var(--color-white);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-gray-200);
  overflow: hidden;
}

/* Card Variants */
.card-default { box-shadow: var(--shadow-sm); }
.card-elevated { box-shadow: var(--shadow-md); }
.card-flat { border: 1px solid var(--color-gray-200); box-shadow: none; }

/* Card Sections */
.card-header {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-gray-100);
}

.card-body {
  padding: var(--space-6);
}

.card-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-gray-100);
  background-color: var(--color-gray-50);
}
```

### Forms

```css
/* Form Group */
.form-group {
  margin-bottom: var(--space-4);
}

/* Label */
.form-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-gray-700);
}

/* Input */
.form-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
  color: var(--color-gray-900);
  background-color: var(--color-white);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-lg);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-input::placeholder {
  color: var(--color-gray-400);
}

.form-input:disabled {
  background-color: var(--color-gray-100);
  cursor: not-allowed;
}

/* Input States */
.form-input-error {
  border-color: var(--color-error);
}
.form-input-error:focus {
  box-shadow: 0 0 0 3px var(--color-error-light);
}

/* Error Message */
.form-error {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-error);
}

/* Select */
.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
  background-position: right var(--space-3) center;
  background-repeat: no-repeat;
  background-size: 1.25rem;
  padding-right: var(--space-10);
}

/* Checkbox & Radio */
.form-checkbox,
.form-radio {
  width: 1rem;
  height: 1rem;
  border: 1px solid var(--color-gray-300);
  color: var(--color-primary);
  transition: all var(--transition-fast);
}

.form-checkbox {
  border-radius: var(--radius-md);
}

.form-radio {
  border-radius: var(--radius-full);
}
```

### Badges

```css
/* Base Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  border-radius: var(--radius-full);
}

/* Badge Variants */
.badge-default {
  background-color: var(--color-gray-100);
  color: var(--color-gray-700);
}

.badge-primary {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
}

.badge-success {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.badge-warning {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

.badge-error {
  background-color: var(--color-error-light);
  color: var(--color-error);
}
```

### Alerts

```css
/* Base Alert */
.alert {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
}

/* Alert Variants */
.alert-info {
  background-color: var(--color-info-light);
  color: var(--color-info);
}

.alert-success {
  background-color: var(--color-success-light);
  color: var(--color-success);
}

.alert-warning {
  background-color: var(--color-warning-light);
  color: var(--color-warning);
}

.alert-error {
  background-color: var(--color-error-light);
  color: var(--color-error);
}
```

---

## 7. Responsive Rules

### Breakpoints

| Name | Min Width | Max Width | Usage |
|------|-----------|-----------|-------|
| `xs` | 0px | 639px | Mobile phones |
| `sm` | 640px | 767px | Large phones |
| `md` | 768px | 1023px | Tablets |
| `lg` | 1024px | 1279px | Small laptops |
| `xl` | 1280px | 1535px | Desktops |
| `2xl` | 1536px | ∞ | Large screens |

### Responsive Patterns

```css
/* Mobile-First Approach - Base styles for mobile */
.component {
  padding: var(--space-4);
  font-size: var(--font-size-base);
}

/* Tablet and up */
@media (min-width: 768px) {
  .component {
    padding: var(--space-6);
    font-size: var(--font-size-lg);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .component {
    padding: var(--space-8);
  }
}
```

### Common Responsive Patterns

```css
/* Hide on mobile, show on desktop */
.hide-mobile { display: none; }
@media (min-width: 768px) {
  .hide-mobile { display: block; }
}

/* Show on mobile, hide on desktop */
.hide-desktop { display: block; }
@media (min-width: 768px) {
  .hide-desktop { display: none; }
}

/* Responsive Grid */
.responsive-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 640px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-6);
  }
}

@media (min-width: 1280px) {
  .responsive-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Responsive Stack */
.responsive-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .responsive-stack {
    flex-direction: row;
    align-items: center;
  }
}

/* Responsive Typography */
.responsive-heading {
  font-size: var(--font-size-2xl);
}

@media (min-width: 768px) {
  .responsive-heading {
    font-size: var(--font-size-3xl);
  }
}

@media (min-width: 1024px) {
  .responsive-heading {
    font-size: var(--font-size-4xl);
  }
}
```

---

## 8. Animation & Motion

### Transition Durations

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | 150ms | Micro-interactions, hovers |
| `--transition-base` | 200ms | Standard transitions |
| `--transition-slow` | 300ms | Page transitions, modals |

### Easing Functions

```css
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Common Animations

```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fadeIn var(--transition-base) var(--ease-out);
}

/* Fade In Up */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fadeInUp var(--transition-base) var(--ease-out);
}

/* Scale In */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-scale-in {
  animation: scaleIn var(--transition-base) var(--ease-out);
}

/* Slide In Right */
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.animate-slide-in-right {
  animation: slideInRight var(--transition-base) var(--ease-out);
}

/* Spinner */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin {
  animation: spin 1s linear infinite;
}

/* Pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-pulse {
  animation: pulse 2s var(--ease-in-out) infinite;
}

/* Hover Transitions */
.hover-lift {
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.hover-scale {
  transition: transform var(--transition-fast);
}
.hover-scale:hover {
  transform: scale(1.02);
}
```

---

## 9. Accessibility

### Focus States

```css
/* Visible Focus Ring */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Custom Focus for Interactive Elements */
.focus-ring:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-white), 0 0 0 4px var(--color-primary);
}
```

### Screen Reader Only

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### ARIA Patterns

```css
/* Disabled State */
[aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Current/Active State */
[aria-current="true"],
[aria-current="page"] {
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

/* Expanded State */
[aria-expanded="true"] .icon-chevron {
  transform: rotate(180deg);
}
```

---

## 10. File Organization

### Directory Structure

```
project/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Primitive components (Button, Input, Card)
│   │   ├── forms/           # Form-specific components
│   │   ├── layout/          # Layout components (Header, Footer, Sidebar)
│   │   └── feedback/        # Feedback components (Alert, Toast, Modal)
│   ├── styles/
│   │   ├── base/            # Base styles (reset, typography)
│   │   ├── tokens/          # CSS variables, design tokens
│   │   ├── utilities/       # Utility classes
│   │   └── components/      # Component-specific styles
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   └── types/               # TypeScript types
├── public/                  # Static assets
└── docs/                    # Documentation
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `Button.tsx`, `CardHeader.tsx` |
| Files | camelCase | `useAuth.ts`, `formatDate.ts` |
| CSS Classes | kebab-case | `.btn-primary`, `.card-header` |
| CSS Variables | kebab-case | `--color-primary`, `--space-4` |
| Constants | SCREAMING_SNAKE_CASE | `API_BASE_URL`, `MAX_ITEMS` |

---

## Quick Reference

### Common Component Template

```tsx
// ComponentName.tsx
import React from 'react';
import './ComponentName.css';

export interface ComponentNameProps {
  /** Description of the prop */
  variant?: 'default' | 'primary' | 'secondary';
  /** Description of the prop */
  size?: 'sm' | 'md' | 'lg';
  /** Description of the prop */
  disabled?: boolean;
  /** Description of the prop */
  children: React.ReactNode;
  /** Description of the prop */
  onClick?: () => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  variant = 'default',
  size = 'md',
  disabled = false,
  children,
  onClick,
  ...props
}) => {
  const classNames = [
    'component-name',
    `component-name--${variant}`,
    `component-name--${size}`,
    disabled && 'component-name--disabled',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classNames}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};
```

### CSS Component Template

```css
/* ComponentName.css */

/* Base */
.component-name {
  /* Base styles using design tokens */
  padding: var(--space-3) var(--space-5);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

/* Variants */
.component-name--default {
  background-color: var(--color-gray-100);
  color: var(--color-gray-700);
}

.component-name--primary {
  background-color: var(--color-primary);
  color: var(--color-white);
}

.component-name--secondary {
  background-color: var(--color-secondary);
  color: var(--color-white);
}

/* Sizes */
.component-name--sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-xs);
}

.component-name--lg {
  padding: var(--space-4) var(--space-6);
  font-size: var(--font-size-base);
}

/* States */
.component-name--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.component-name:hover:not(.component-name--disabled) {
  /* Hover styles */
}

.component-name:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## Usage Instructions for AI

When creating a component, reference this document:

1. **Colors**: Use Section 2 - stick to the defined palette
2. **Typography**: Use Section 3 - follow the type scale
3. **Spacing**: Use Section 4 - apply the spacing scale consistently
4. **Layout**: Use Section 5 - use the grid and flex patterns
5. **Components**: Use Section 6 - follow established component patterns
6. **Responsive**: Use Section 7 - implement mobile-first responsive design
7. **Animation**: Use Section 8 - apply consistent transitions and animations
8. **Accessibility**: Use Section 9 - ensure WCAG compliance

**Example instruction**: "Style this button component per FRONTEND_GUIDELINES.md Section 6 (Buttons) using primary variant, medium size."

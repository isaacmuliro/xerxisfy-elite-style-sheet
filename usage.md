# X2S Usage Guide

## Overview

X2S, short for Xerxisfy Elite Style Sheet, is a TypeScript-based CSS preprocessor for `.x2s` files. It compiles a single file or a directory of files into one CSS output, with support for nesting, variables, mixins, imports, built-in module libraries, asset processing, loops, theme baking, semantic layers, guard locks, purge, deduplication, source maps, and watch mode.

## Requirements

- Node.js
- npm
- TypeScript is already installed through the project dependencies

## Project structure

Key files and directories:

- `src/index.ts`: CLI entrypoint and public API
- `src/parser.ts`: Parses `.x2s` source into an AST
- `src/compiler.ts`: Compiles the AST into CSS
- `src/source-map.ts`: Source map generation
- `src/tests.ts`: Integration-style test coverage
- `src/types.ts`: Shared types for AST, compiler, and results
- `src/utils/helpers.ts`: CLI parsing and file helpers
- `editors/vscode/`: VS Code language support and icon theme
- `docs/`: notes, roadmap, and command documentation

## Build

Compile TypeScript into `dist/`:

```bash
npm run build
```

Run the test suite:

```bash
npm test
```

## Running the compiler

Local repo usage:

```bash
npm run x2s -- app.x2s app.css
```

Direct Node usage:

```bash
node dist/index.js app.x2s app.css
```

If you want the `x2s` command globally in your shell:

```bash
npm link
x2s app.x2s app.css
```

## CLI options

Basic compilation:

```bash
npm run x2s -- app.x2s app.css
```

Compile a directory of `.x2s` files into one CSS file:

```bash
npm run x2s -- ./styles ./public/styles.css
```

Watch mode:

```bash
npm run x2s -- app.x2s app.css --watch
```

Minified output:

```bash
npm run x2s -- app.x2s app.css --minify
```

Ghost purging using markup or app source:

```bash
npm run x2s -- ./styles ./public/styles.css --purge "./src,./public"
```

External source map:

```bash
npm run x2s -- app.x2s app.css --sourcemap
```

Inline source map:

```bash
npm run x2s -- app.x2s app.css --inline-sourcemap
```

Write generated `.webp` assets to a custom directory:

```bash
npm run x2s -- app.x2s app.css --asset-dir ./public/generated-assets
```

Disable automatic asset processing:

```bash
npm run x2s -- app.x2s app.css --no-assets
```

Disable repeated-rule deduplication:

```bash
npm run x2s -- app.x2s app.css --no-dedupe
```

## What gets generated

Without source maps:

- `app.css`

With `--sourcemap`:

- `app.css`
- `app.css.map`
- a `/*# sourceMappingURL=app.css.map */` footer in the CSS

With `--inline-sourcemap`:

- `app.css`
- the source map is embedded as a data URL comment

With asset conversion enabled and a supported converter available:

- `app.css`
- `x2s-assets/*.webp` by default, or files under the path passed to `--asset-dir`
- rewritten asset URLs in the generated CSS

## Supported X2S syntax

### Comments

```x2s
// single-line comment
# single-line comment when # starts the line
** block comment **
```

`#` comments are only treated as comments when the `#` is the first non-whitespace character on the line. That keeps these valid:

```x2s
$brand: #224466;

#hero {
  color: white;
}
```

### Variables

```x2s
$brand: #224466;

.button {
  color: $brand;
}
```

Variables are resolved through lexical scope. Inner scopes can shadow outer variables.

### Context-aware scoped global variables

```x2s
$primary: #224466;

@context header {
  $primary: darken($primary, 20%);
}

@context footer {
  $primary: lighten($primary, 20%);
}

header .cta {
  color: $primary;
}

footer .cta {
  color: $primary;
}
```

How it works:

- local variables still win first
- if there is no local override, X2S checks matching `@context` blocks
- if no context matches, X2S falls back to the global variable value

This lets one global token adapt automatically to selector context without repeating variable names.

### Nesting

```x2s
.card {
  color: black;

  &:hover {
    color: red;
  }

  .title {
    font-weight: bold;
  }
}
```

### Imports and partials

```x2s
@import "./tokens";
@import "./components/button";
@import "x2s:reset";
@import "x2s:grid";
@import "x2s:typography";
```

Supported resolution patterns:

- exact file path
- `name.x2s`
- `_name.x2s`
- `name/index.x2s`

Built-in module aliases:

- `x2s:reset` or `@x2s/reset`
- `x2s:grid` or `@x2s/grid`
- `x2s:typography` or `@x2s/typography`
- `x2s:all` or `@x2s/all`

The built-in modules are regular X2S sources, so their variables, rules, and mixins become available in the same way as file imports.

### Built-in module libraries

#### Reset

`x2s:reset` provides a practical baseline for box sizing, media defaults, form inheritance, and common list/button normalization.

#### Grid

`x2s:grid` provides:

- `.x2s-container`
- `.x2s-row`
- `.x2s-col`
- `.x2s-span-1` through `.x2s-span-12`
- `@mixin x2s-container($max, $padding)`
- `@mixin x2s-row($gap)`
- `@mixin x2s-span($count, $columns)`

Example:

```x2s
@import "x2s:grid";

.page {
  @include x2s-container(80rem, 2rem);
}

.gallery {
  @include x2s-row(2rem);
}
```

#### Typography

`x2s:typography` provides:

- base `body`, heading, and code styles
- `.x2s-prose`
- `.x2s-balance`
- `.x2s-kicker`
- `@mixin x2s-heading($size, $weight)`
- `@mixin x2s-copy($measure)`

Example:

```x2s
@import "x2s:typography";

.article-title {
  @include x2s-heading(4rem, 800);
}

.article-body {
  @include x2s-copy(72ch);
}
```

### Mixins and includes

```x2s
@mixin card($radius: 12px) {
  border-radius: $radius;
  display: flex;
}

.panel {
  @include card(16px);
}
```

### Extend

```x2s
.button {
  padding: 12px 16px;
}

.button--primary {
  @extend .button;
}
```

### Conditionals and loops

```x2s
@if $theme == dark {
  body {
    color: white;
  }
}

@each $name in primary, secondary, danger {
  .btn-#{$name} {
    display: flex;
  }
}

@for $i from 1 through 3 {
  .col-#{$i} {
    width: math(100% / 3);
  }
}
```

### Theme baking

```x2s
.button {
  color: light(#111111) dark(#f5f5f5);
}
```

This generates the light value in the base rule and the dark value inside:

```css
@media (prefers-color-scheme: dark) { ... }
```

### Semantic layers

```x2s
.modal {
  layer: modal;
}
```

This compiles to a named `z-index`. Current defaults include:

- `base`
- `header`
- `sticky`
- `dropdown`
- `overlay`
- `modal`
- `toast`
- `tooltip`

You can also register custom layer names:

```x2s
@layers page, nav, modal, tooltip;
```

### Xerx Guard locks

```x2s
.brand-button {
  color: #111111;
  @lock color;
}
```

Or:

```x2s
.theme {
  color: #111111;
}

@lock .theme => color;
```

If a later rule tries to override a locked property, compilation fails.

### Automatic shared utilities

X2S now scans for repeated declaration groups across compiled rules and emits shared utility blocks automatically.

Example input:

```x2s
.card {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.badge {
  display: flex;
  align-items: center;
  padding: 4px;
}
```

Example output shape:

```css
.x2s-u-1, .card, .badge {
  --x2s-u-1-display-0: -webkit-box;
  --x2s-u-1-display-1: -ms-flexbox;
  --x2s-u-1-display-2: flex;
  --x2s-u-1-align-items-3: center;
}
```

The original rules keep their declaration order, but repeated values are rewritten to `var(...)` references. That gives you generated shared utilities without moving the actual declarations out of their original cascade positions.

## Built-in functions

### Math

```x2s
.col {
  width: math(100% / 3);
}
```

### Color helpers

```x2s
.card {
  color: lighten(#224466, 12%);
  border-color: darken(#224466, 10%);
  background: alpha(#224466, 0.4);
  outline-color: mix(#224466, #ffffff, 40%);
}
```

### Container helpers

```x2s
.panel {
  width: cw(50%);
  height: ch(100%);
  inline-size: ci(75%);
  block-size: cb(100% / 2);
  max-inline-size: cmin(50% - 1rem);
  min-block-size: cmax(20% + 2rem);
}
```

Available helpers:

- `cw(...)` -> `cqw`
- `ch(...)` -> `cqh`
- `ci(...)` -> `cqi`
- `cb(...)` -> `cqb`
- `cmin(...)` -> `cqmin`
- `cmax(...)` -> `cqmax`

These helpers accept plain percentages and expression forms. Examples:

- `cw(50%)` -> `50cqw`
- `cb(100% / 2)` -> `50cqb`
- `cmin(50% - 1rem)` -> `calc(50cqmin - 1rem)`
- `math(cw(100%) / 3)` -> `33.3333cqw`

## Asset pipeline

X2S now scans declaration values for local raster `url(...)` references ending in `.png`, `.jpg`, or `.jpeg`. When asset processing is enabled and a converter is available, it:

1. resolves the source asset relative to the `.x2s` file that referenced it
2. emits a generated `.webp` file
3. rewrites the CSS URL to the emitted asset path
4. adds the source asset to watch-mode dependencies

Example input:

```x2s
.hero {
  background-image: url("./hero.png");
}
```

Example output shape:

```css
.hero {
  background-image: url("./x2s-assets/hero-1a2b3c4d.webp");
}
```

Converter resolution order:

- `X2S_WEBP_CONVERTER` environment variable
- `cwebp`
- `magick`
- `ffmpeg`

Notes:

- if no converter is available, X2S leaves the original URL in place and emits a warning
- generated assets default to `x2s-assets/` beside the output CSS file
- `--asset-dir` overrides that output location
- `--no-assets` disables rewriting entirely

## Polyfilling and prefixing

X2S now adds a broader zero-config fallback layer for several modern CSS properties and values, including:

- `display: flex`
- `display: inline-flex`
- `user-select`
- `appearance`
- `backdrop-filter`
- `filter`
- `backface-visibility`
- `transform`
- `transform-origin`
- `transform-style`
- `perspective`
- `perspective-origin`
- `mask` and `mask-*`
- `position: sticky`
- `hyphens`
- `text-size-adjust`
- `background-clip: text`
- `clip-path`
- `gap`, `row-gap`, and `column-gap`
- `place-items`, `place-content`, and `place-self`
- `overflow: clip`
- `text-decoration-skip-ink`
- `inline-size`, `block-size`, and min/max variants
- `margin-inline`, `margin-block`, `padding-inline`, `padding-block`
- `inset`, `inset-inline`, `inset-block`, and start/end variants
- `width: fit-content`
- `min-width: fit-content`
- `max-width: fit-content`
- `height: fit-content`
- `min-height: fit-content`
- `max-height: fit-content`

Examples:

- logical size properties are expanded to common physical fallbacks such as `inline-size` -> `width`
- logical spacing properties like `margin-inline` become `margin-left` and `margin-right`
- `place-items: center start` becomes `align-items: center` and `justify-items: start`
- `overflow: clip` gets an `overflow: hidden` fallback before the original declaration

This is still not a full PostCSS replacement, but it is materially broader than the original prefix-only layer.

## Source maps

X2S now emits standard source maps in source map v3 format.

Current behavior:

- generated CSS can be linked to original `.x2s` source files
- source contents are embedded in the map
- mappings are generated at rule and declaration emission points

This is sufficient for browser devtools and editor integrations, but it is still a compiler-side source map implementation, not a full ecosystem integration.

## Purge behavior

When `--purge` is used, X2S scans content files for selector usage in:

- HTML tags
- `class` and `className`
- `id`
- `querySelector` and `querySelectorAll`
- `getElementById`
- `getElementsByClassName`
- `classList.add`, `remove`, and `toggle`

Unused rules are removed from the final CSS bundle.

## Watch mode behavior

Watch mode:

- watches source `.x2s` files and imported dependencies
- watches local assets referenced for `.webp` conversion
- watches purge-content files and directories when `--purge` is enabled
- ignores its own generated `.css` output to avoid rebuild loops

## Public API

The main API lives in `src/index.ts`:

```ts
import { compileEntry, compileString } from './src/index';
```

### `compileEntry(entryPath, options)`

Compiles a single `.x2s` file or an entire directory.

### `compileString(source, filePath, options)`

Compiles inline X2S source and returns the generated CSS and optional source map.

## How the compiler is built

High-level pipeline:

1. `src/parser.ts` reads X2S source and produces an AST.
2. `src/compiler.ts` walks the AST, resolves variables, context-aware globals, mixins, loops, themes, and extends.
3. The compiler emits normalized rules and declarations.
4. Deduplication, purge, and shared-utility extraction run before final rendering.
5. `src/source-map.ts` builds a source map from generated output back to original `.x2s` locations.
6. `src/index.ts` writes CSS, optional source maps, and handles watch mode.

## VS Code support

VS Code language support lives in:

- `editors/vscode/package.json`
- `editors/vscode/syntaxes/x2s.tmLanguage.json`
- `editors/vscode/language-configuration.json`
- `editors/vscode/themes/x2s-icon-theme.json`

That support currently provides:

- `.x2s` language registration
- syntax highlighting
- comment configuration
- bracket pairing
- a custom `x2s` file icon theme

## Current gaps

The main remaining gaps are ecosystem breadth rather than the core roadmap features from `nextfeatures.md`. X2S still does not try to fully replicate PostCSS-scale browser transforms or writing-mode-perfect logical property polyfills.

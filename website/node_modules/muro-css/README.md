# Muro Style Sheet

Muro Style Sheet is a TypeScript CSS preprocessor for `.mss` files. It compiles a single entry file or an entire directory of `.mss` sources into one CSS file and supports watch mode for iterative development.

## Implemented features

- Directory or single-file compilation into one `.css` bundle
- `--watch`, `--minify`, `--purge`, `--sourcemap`, `--inline-sourcemap`, `--asset-dir`, and `--no-assets` CLI options
- Variables with nested scope
- Context-aware scoped global variables with `@context`
- Nesting with `&` selector interpolation
- `@mixin` and `@include`
- `@import` partials
- Built-in module libraries via `@import "muro:reset"`, `muro:grid`, `muro:typography`, or `muro:all`
- `@extend`
- `@if`, `@each`, and `@for`
- Theme baking with `light(...) dark(...)`
- Semantic layering with `layer: modal;`
- Muro Guard locks with `@lock`
- Comments with `//`, `#` at the start of a line, and `** ... **`
- External and inline source maps
- Broader zero-config polyfilling for logical properties, layout shorthands, and browser-sensitive properties
- Richer container math with `cw`, `ch`, `ci`, `cb`, `cmin`, and `cmax`
- Automatic raster asset rewriting to generated `.webp` files when a converter is available
- Automatic shared utility generation for repeated declaration groups
- Repeated-rule deduplication to group identical declarations into shared selector blocks

## Install

Install Muro in an app project:

```bash
npm i -D muro-css
```

If you want a regular dependency instead, the short branded install also works:

```bash
npm i muro-css
```

Recommended project scripts:

```json
{
  "scripts": {
    "muro": "muro app.mss app.css",
    "muro:watch": "muro app.mss app.css --watch"
  }
}
```

Then run:

```bash
npm run muro
npm run muro:watch
```

Legacy compatibility:

- `.x2s` files still compile for one release
- legacy `x2s:*` and `@x2s/*` built-in imports still resolve for one release
- the `x2s` CLI alias is still shipped for one release

## CLI

Build this repo:

```bash
npm run build
```

Run it locally from this repo:

```bash
npm run muro -- app.mss app.css
```

You can also invoke the built entry directly:

```bash
node dist/index.js app.mss app.css
```

If you want the bare `muro` command in your shell, link the package once:

```bash
npm link
muro app.mss app.css
```

Compile a file:

```bash
npm run muro -- app.mss app.css
```

Compile a directory:

```bash
npm run muro -- ./styles ./public/styles.css
```

Watch for changes:

```bash
npm run muro -- ./styles ./public/styles.css --watch
```

Purge unused selectors using HTML or JS content:

```bash
npm run muro -- ./styles ./public/styles.css --purge "./src,./public"
```

Emit an external source map:

```bash
npm run muro -- app.mss app.css --sourcemap
```

Emit an inline source map:

```bash
npm run muro -- app.mss app.css --inline-sourcemap
```

Write generated `.webp` assets to a custom directory:

```bash
npm run muro -- app.mss app.css --asset-dir ./public/generated-assets
```

## Comments

Muro accepts these comment styles:

```mss
// single-line comment
# single-line comment at the start of a line
** block comment **
```

`#` comments are only treated as comments when the `#` is the first non-whitespace character on the line, so hex colors like `#224466` and selectors like `#hero` still work.

## Syntax examples

```mss
$brand: #224466;

@mixin card($radius: 12px) {
  border-radius: $radius;
  display: flex;
}

.button {
  @include card;
  layer: modal;
  color: light(#111111) dark(#f5f5f5);

  &:hover {
    color: $brand;
  }
}

.button--primary {
  @extend .button;
}

@for $i from 1 through 3 {
  .col-#{$i} {
    width: math(100% / 3);
  }
}

$primary: #224466;

@context header {
  $primary: darken($primary, 20%);
}

header .cta {
  color: $primary;
}
```

Inside a rule, lock brand-critical properties:

```mss
.brand-button {
  color: #111111;
  @lock color;
}
```

Or lock an explicit selector:

```mss
.theme {
  color: #111111;
}

@lock .theme => color;
```

## Built-In Modules

Muro includes importable module libraries for reset, grid, and typography:

```mss
@import "muro:reset";
@import "muro:grid";
@import "muro:typography";
```

Or import all three at once:

```mss
@import "muro:all";
```

The grid and typography modules also expose mixins such as `muro-container`, `muro-row`, `muro-span`, `muro-heading`, and `muro-copy`.

## Asset Processing

Local `.png`, `.jpg`, and `.jpeg` URLs are rewritten to generated `.webp` files during compilation when Muro can reach a converter. The compiler currently tries:

- `MURO_WEBP_CONVERTER` if you set it
- `cwebp`
- `magick`
- `ffmpeg`

Example:

```mss
.hero {
  background-image: url("./hero.png");
}
```

This emits the converted asset into `muro-assets/` beside the compiled CSS by default, then rewrites the CSS URL to the new `.webp` path.

## Shared Utilities

Muro now detects repeated declaration groups and emits shared utility blocks such as `.muro-u-1`. It uses utility-backed custom properties so the original declarations stay in place while repeated values are centralized.

## Container Math

Muro now supports expression-aware container helpers:

```mss
.panel {
  inline-size: ci(75%);
  max-inline-size: cmin(50% - 1rem);
  block-size: cb(100% / 2);
  width: math(cw(100%) / 3);
}
```

These helpers compile to container query units and `calc(...)` expressions when needed.

## Editor Support

VS Code support lives in the repository under `editors/vscode/`. It includes:

- `.mss` language registration
- syntax highlighting
- comment and bracket configuration
- an `Muro Icons` file icon theme for `.mss`

## API

```ts
import { compileEntry, compileString } from './src/index';
```

- `compileEntry(path, options)` compiles a file or directory
- `compileString(source, filePath, options)` compiles inline Muro source

## Status

The current codebase is a working compiler foundation aligned with the goals in `Directions.md`. The remaining work is now mostly depth and refinement rather than missing core roadmap items.

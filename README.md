# Xerxisfy Elite Style Sheet

Xerxisfy Elite Style Sheet, or `X2S`, is a TypeScript CSS preprocessor for `.x2s` files. It compiles a single entry file or an entire directory of `.x2s` sources into one CSS file and supports watch mode for iterative development.

## Implemented features

- Directory or single-file compilation into one `.css` bundle
- `--watch`, `--minify`, `--purge`, `--sourcemap`, `--inline-sourcemap`, `--asset-dir`, and `--no-assets` CLI options
- Variables with nested scope
- Context-aware scoped global variables with `@context`
- Nesting with `&` selector interpolation
- `@mixin` and `@include`
- `@import` partials
- Built-in module libraries via `@import "x2s:reset"`, `x2s:grid`, `x2s:typography`, or `x2s:all`
- `@extend`
- `@if`, `@each`, and `@for`
- Theme baking with `light(...) dark(...)`
- Semantic layering with `layer: modal;`
- Xerx Guard locks with `@lock`
- Comments with `//`, `#` at the start of a line, and `** ... **`
- External and inline source maps
- Broader zero-config polyfilling for logical properties, layout shorthands, and browser-sensitive properties
- Richer container math with `cw`, `ch`, `ci`, `cb`, `cmin`, and `cmax`
- Automatic raster asset rewriting to generated `.webp` files when a converter is available
- Automatic shared utility generation for repeated declaration groups
- Repeated-rule deduplication to group identical declarations into shared selector blocks

## CLI

Build the project:

```bash
npm run build
```

Run it locally from this repo:

```bash
npm run x2s -- app.x2s app.css
```

You can also invoke the built entry directly:

```bash
node dist/index.js app.x2s app.css
```

If you want the bare `x2s` command in your shell, link the package once:

```bash
npm link
x2s app.x2s app.css
```

Compile a file:

```bash
npm run x2s -- app.x2s app.css
```

Compile a directory:

```bash
npm run x2s -- ./styles ./public/styles.css
```

Watch for changes:

```bash
npm run x2s -- ./styles ./public/styles.css --watch
```

Purge unused selectors using HTML or JS content:

```bash
npm run x2s -- ./styles ./public/styles.css --purge "./src,./public"
```

Emit an external source map:

```bash
npm run x2s -- app.x2s app.css --sourcemap
```

Emit an inline source map:

```bash
npm run x2s -- app.x2s app.css --inline-sourcemap
```

Write generated `.webp` assets to a custom directory:

```bash
npm run x2s -- app.x2s app.css --asset-dir ./public/generated-assets
```

## Comments

X2S accepts these comment styles:

```x2s
// single-line comment
# single-line comment at the start of a line
** block comment **
```

`#` comments are only treated as comments when the `#` is the first non-whitespace character on the line, so hex colors like `#224466` and selectors like `#hero` still work.

## Syntax examples

```x2s
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

```x2s
.brand-button {
  color: #111111;
  @lock color;
}
```

Or lock an explicit selector:

```x2s
.theme {
  color: #111111;
}

@lock .theme => color;
```

## Built-In Modules

X2S includes importable module libraries for reset, grid, and typography:

```x2s
@import "x2s:reset";
@import "x2s:grid";
@import "x2s:typography";
```

Or import all three at once:

```x2s
@import "x2s:all";
```

The grid and typography modules also expose mixins such as `x2s-container`, `x2s-row`, `x2s-span`, `x2s-heading`, and `x2s-copy`.

## Asset Processing

Local `.png`, `.jpg`, and `.jpeg` URLs are rewritten to generated `.webp` files during compilation when X2S can reach a converter. The compiler currently tries:

- `X2S_WEBP_CONVERTER` if you set it
- `cwebp`
- `magick`
- `ffmpeg`

Example:

```x2s
.hero {
  background-image: url("./hero.png");
}
```

This emits the converted asset into `x2s-assets/` beside the compiled CSS by default, then rewrites the CSS URL to the new `.webp` path.

## Shared Utilities

X2S now detects repeated declaration groups and emits shared utility blocks such as `.x2s-u-1`. It uses utility-backed custom properties so the original declarations stay in place while repeated values are centralized.

## Container Math

X2S now supports expression-aware container helpers:

```x2s
.panel {
  inline-size: ci(75%);
  max-inline-size: cmin(50% - 1rem);
  block-size: cb(100% / 2);
  width: math(cw(100%) / 3);
}
```

These helpers compile to container query units and `calc(...)` expressions when needed.

## Editor Support

VS Code support lives in [editors/vscode/README.md](/Users/xerxiscmuliro/xcss/editors/vscode/README.md). It includes:

- `.x2s` language registration
- syntax highlighting
- comment and bracket configuration
- an `X2S Icons` file icon theme for `.x2s`

## API

```ts
import { compileEntry, compileString } from './src/index';
```

- `compileEntry(path, options)` compiles a file or directory
- `compileString(source, filePath, options)` compiles inline X2S source

## Status

The current codebase is a working compiler foundation aligned with the goals in `Directions.md`. The remaining work is now mostly depth and refinement rather than missing core roadmap items.
# xerxisfy-elite-style-sheet

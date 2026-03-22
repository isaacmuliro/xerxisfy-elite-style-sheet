# Next Features

## Implemented recently

- Source maps
- Better built-in prefixing and polyfill coverage than the original minimal version
- Context-aware scoped global variables
- Automatic shared utility generation for repeated declaration groups
- Automatic asset conversion pipeline for `.webp` output when a converter is available
- Built-in module libraries for reset, grid, and typography
- Broader zero-config polyfilling for logical/layout properties and more browser-sensitive declarations
- Richer dynamic container math beyond `cw()` and `ch()`

## Still pending

No roadmap items are currently open in this file. Further work is now refinement and expansion rather than missing planned core features.

## Notes

Current source map support is now present and usable from the CLI with:

```bash
npm run muro -- app.mss app.css --sourcemap
```

Current prefixing covers:

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
- `gap`, `row-gap`, `column-gap`
- `place-items`, `place-content`, `place-self`
- `overflow: clip`
- `text-decoration-skip-ink`
- logical size, spacing, and inset properties
- `fit-content` width variants
- `fit-content` height variants

Current container helpers now cover:

- `cw(...)` -> `cqw`
- `ch(...)` -> `cqh`
- `ci(...)` -> `cqi`
- `cb(...)` -> `cqb`
- `cmin(...)` -> `cqmin`
- `cmax(...)` -> `cqmax`
- expression-aware evaluation such as `cb(100% / 2)` and `cmin(50% - 1rem)`

Current asset processing covers:

- local `.png`, `.jpg`, and `.jpeg` URLs inside `url(...)`
- generated `.webp` files written beside the compiled CSS by default
- custom converter override through `MURO_WEBP_CONVERTER`
- built-in converter probing for `cwebp`, `magick`, and `ffmpeg`

Built-in module imports now include:

- `muro:reset`
- `muro:grid`
- `muro:typography`
- `muro:all`

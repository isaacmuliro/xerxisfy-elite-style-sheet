For normal project usage, install the package and keep the branding on `x2s`:

```bash
npm i -D x2s
```

Or, if you do not want it scoped as a dev dependency:

```bash
npm i x2s
```

```json
{
  "scripts": {
    "x2s": "x2s app.x2s app.css",
    "x2s:watch": "x2s app.x2s app.css --watch"
  }
}
```

Then run:

```bash
npm run x2s
npm run x2s:watch
```

`x2s` is not auto-added to your shell just because the project built. The `bin` entry in `package.json` only becomes a real shell command after the package is linked or installed.

From this repo, use either:

```bash
npm run x2s -- app.x2s app.css
```

or:

```bash
node dist/index.js app.x2s app.css
```

If you want bare `x2s` to work in your shell, run:

```bash
npm link
x2s app.x2s app.css
```

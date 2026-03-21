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

For normal project usage, install the package and keep the branding on `muro`:

```bash
npm i -D muro-css
```

Or, if you do not want it scoped as a dev dependency:

```bash
npm i muro-css
```

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

`muro` is not auto-added to your shell just because the project built. The `bin` entry in `package.json` only becomes a real shell command after the package is linked or installed.

From this repo, use either:

```bash
npm run muro -- app.mss app.css
```

or:

```bash
node dist/index.js app.mss app.css
```

If you want bare `muro` to work in your shell, run:

```bash
npm link
muro app.mss app.css
```

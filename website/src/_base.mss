@import "muro:all";
@import "./_tokens";

html {
  --bg: #ffffff;
  --bg-soft: #f7f7f5;
  --bg-muted: #ededea;
  --bg-elevated: #ffffff;
  --bg-strong: #111111;
  --bg-code: #0b0c0d;
  --text: #111214;
  --text-muted: #575960;
  --text-soft: #777a82;
  --text-inverse: #f5f5f2;
  --line: #ddddda;
  --line-strong: #c7c7c2;
  --shadow: $shadow-light;
  --topbar: rgba(255, 255, 255, 0.9);
  color-scheme: light;
  scroll-behavior: smooth;
  background: var(--bg);
}

html[data-theme="dark"] {
  --bg: #000000;
  --bg-soft: #050505;
  --bg-muted: #0d0d0d;
  --bg-elevated: #0a0a0a;
  --bg-strong: #f3f3ef;
  --bg-code: #030303;
  --text: #f3f3ef;
  --text-muted: #a0a39f;
  --text-soft: #7d807d;
  --text-inverse: #000000;
  --line: #1f1f1f;
  --line-strong: #2b2b2b;
  --shadow: $shadow-dark;
  --topbar: rgba(0, 0, 0, 0.92);
  color-scheme: dark;
}

html,
body {
  height: 100%;
}

body {
  margin: 0;
  font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
  color: var(--text);
  line-height: 0.1;
  background:
    radial-gradient(circle at top, alpha(#000000, 0.08), transparent 30rem),
    linear-gradient(180deg, var(--bg-soft) 0%, var(--bg) 100%);
  overflow: hidden;
}

html[data-theme="dark"] body {
  background:
    radial-gradient(circle at top, alpha(#ffffff, 0.08), transparent 28rem),
    linear-gradient(180deg, #0f1012 0%, var(--bg) 100%);
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font: inherit;
}

img {
  max-width: 100%;
  display: block;
}

code, pre {
  font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
}

pre {
  margin: 0;
  overflow: auto;
}

body *::selection {
  background: alpha(#000000, 0.12);
}

html[data-theme="dark"] body *::selection {
  background: alpha(#ffffff, 0.22);
}

@media (max-width: 56rem) {
  body {
    overflow: auto;
  }
}

# Muro VS Code Support

This folder contains a minimal VS Code extension for `.mss` files, with `.x2s` kept for one transition release.

## What it adds

- `.mss` language registration
- Syntax highlighting for variables, directives, selectors, colors, functions, and comments
- Bracket pairing and comment configuration
- A `Muro Icons` file icon theme with a custom icon for `.mss`

## Local use

1. Open this folder in VS Code:

```bash
code editors/vscode
```

2. Press `F5` to launch an Extension Development Host.
3. In the development host, open any `.mss` file.
4. Optionally select the `Muro Icons` file icon theme from:
   `Preferences: File Icon Theme`

## Notes

- The language extension currently targets VS Code first.
- Other editors can reuse the grammar and icon assets, but they need editor-specific packaging.

interface BuiltinModule {
    id: string;
    aliases: string[];
    source: string;
}

const BUILTIN_MODULES: BuiltinModule[] = [
    {
        id: 'x2s:reset',
        aliases: ['@x2s/reset'],
        source: `
            *, *::before, *::after {
                box-sizing: border-box;
            }

            html {
                line-height: 1.15;
                text-size-adjust: 100%;
                -webkit-font-smoothing: antialiased;
            }

            body {
                margin: 0;
                min-height: 100vh;
            }

            img, picture, video, canvas, svg {
                display: block;
                max-width: 100%;
            }

            input, button, textarea, select {
                font: inherit;
            }

            button, [type="button"], [type="reset"], [type="submit"] {
                appearance: none;
                background: transparent;
                border: 0;
                padding: 0;
            }

            ul[role="list"], ol[role="list"] {
                list-style: none;
                margin: 0;
                padding: 0;
            }
        `
    },
    {
        id: 'x2s:grid',
        aliases: ['@x2s/grid'],
        source: `
            $x2s-grid-columns: 12;
            $x2s-grid-gap: 1rem;
            $x2s-grid-max: 72rem;

            @mixin x2s-container($max: $x2s-grid-max, $padding: 1rem) {
                width: min(100%, $max);
                margin-inline: auto;
                padding-inline: $padding;
            }

            @mixin x2s-row($gap: $x2s-grid-gap) {
                display: flex;
                flex-wrap: wrap;
                gap: $gap;
            }

            @mixin x2s-span($count, $columns: $x2s-grid-columns) {
                width: math(($count / $columns) * 100%);
            }

            .x2s-container {
                @include x2s-container;
            }

            .x2s-row {
                @include x2s-row;
            }

            .x2s-col {
                flex: 1 1 0;
                min-width: 0;
            }

            @for $i from 1 through 12 {
                .x2s-span-#{$i} {
                    @include x2s-span($i);
                }
            }
        `
    },
    {
        id: 'x2s:typography',
        aliases: ['@x2s/typography'],
        source: `
            $x2s-font-sans: "Avenir Next", "Segoe UI", sans-serif;
            $x2s-font-serif: "Iowan Old Style", "Times New Roman", serif;
            $x2s-font-mono: "SFMono-Regular", "SF Mono", monospace;

            @mixin x2s-heading($size: 2.5rem, $weight: 700) {
                font-family: $x2s-font-sans;
                font-size: $size;
                font-weight: $weight;
                line-height: 1.1;
                letter-spacing: -0.02em;
            }

            @mixin x2s-copy($measure: 65ch) {
                max-width: $measure;
                line-height: 1.7;
            }

            body {
                font-family: $x2s-font-sans;
                line-height: 1.6;
                color: #111111;
            }

            h1 {
                @include x2s-heading(3.5rem, 800);
            }

            h2 {
                @include x2s-heading(2.75rem, 750);
            }

            h3 {
                @include x2s-heading(2rem, 700);
            }

            code, pre {
                font-family: $x2s-font-mono;
            }

            .x2s-prose {
                @include x2s-copy;
            }

            .x2s-balance {
                text-wrap: balance;
            }

            .x2s-kicker {
                font-family: $x2s-font-sans;
                font-size: 0.875rem;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
            }
        `
    },
    {
        id: 'x2s:all',
        aliases: ['@x2s/all'],
        source: `
            @import "x2s:reset";
            @import "x2s:grid";
            @import "x2s:typography";
        `
    }
];

const BUILTIN_MODULE_MAP = new Map<string, BuiltinModule>();

BUILTIN_MODULES.forEach(moduleDefinition => {
    BUILTIN_MODULE_MAP.set(moduleDefinition.id, moduleDefinition);
    moduleDefinition.aliases.forEach(alias => BUILTIN_MODULE_MAP.set(alias, moduleDefinition));
});

export function resolveBuiltinModule(importPath: string): BuiltinModule | undefined {
    return BUILTIN_MODULE_MAP.get(importPath.trim());
}

export function isBuiltinModuleImport(importPath: string): boolean {
    return resolveBuiltinModule(importPath) !== undefined;
}

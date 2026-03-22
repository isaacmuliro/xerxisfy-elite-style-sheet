interface BuiltinModule {
    id: string;
    aliases: string[];
    source: string;
}

const BUILTIN_MODULES: BuiltinModule[] = [
    {
        id: 'muro:reset',
        aliases: ['@muro/reset', 'x2s:reset', '@x2s/reset'],
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
        id: 'muro:grid',
        aliases: ['@muro/grid', 'x2s:grid', '@x2s/grid'],
        source: `
            $muro-grid-columns: 12;
            $muro-grid-gap: 1rem;
            $muro-grid-max: 72rem;

            $x2s-grid-columns: $muro-grid-columns;
            $x2s-grid-gap: $muro-grid-gap;
            $x2s-grid-max: $muro-grid-max;

            @mixin muro-container($max: $muro-grid-max, $padding: 1rem) {
                width: min(100%, $max);
                margin-inline: auto;
                padding-inline: $padding;
            }

            @mixin muro-row($gap: $muro-grid-gap) {
                display: flex;
                flex-wrap: wrap;
                gap: $gap;
            }

            @mixin muro-span($count, $columns: $muro-grid-columns) {
                width: math(($count / $columns) * 100%);
            }

            @mixin x2s-container($max: $muro-grid-max, $padding: 1rem) {
                @include muro-container($max, $padding);
            }

            @mixin x2s-row($gap: $muro-grid-gap) {
                @include muro-row($gap);
            }

            @mixin x2s-span($count, $columns: $muro-grid-columns) {
                @include muro-span($count, $columns);
            }

            .muro-container {
                @include muro-container;
            }

            .x2s-container {
                @include muro-container;
            }

            .muro-row {
                @include muro-row;
            }

            .x2s-row {
                @include muro-row;
            }

            .muro-col {
                flex: 1 1 0;
                min-width: 0;
            }

            .x2s-col {
                flex: 1 1 0;
                min-width: 0;
            }

            @for $i from 1 through 12 {
                .muro-span-#{$i} {
                    @include muro-span($i);
                }

                .x2s-span-#{$i} {
                    @include muro-span($i);
                }
            }
        `
    },
    {
        id: 'muro:typography',
        aliases: ['@muro/typography', 'x2s:typography', '@x2s/typography'],
        source: `
            $muro-font-sans: "Avenir Next", "Segoe UI", sans-serif;
            $muro-font-serif: "Iowan Old Style", "Times New Roman", serif;
            $muro-font-mono: "SFMono-Regular", "SF Mono", monospace;

            $x2s-font-sans: $muro-font-sans;
            $x2s-font-serif: $muro-font-serif;
            $x2s-font-mono: $muro-font-mono;

            @mixin muro-heading($size: 2.5rem, $weight: 700) {
                font-family: $muro-font-sans;
                font-size: $size;
                font-weight: $weight;
                line-height: 1.1;
                letter-spacing: -0.02em;
            }

            @mixin muro-copy($measure: 65ch) {
                max-width: $measure;
                line-height: 1.7;
            }

            @mixin x2s-heading($size: 2.5rem, $weight: 700) {
                @include muro-heading($size, $weight);
            }

            @mixin x2s-copy($measure: 65ch) {
                @include muro-copy($measure);
            }

            body {
                font-family: $muro-font-sans;
                line-height: 1.6;
                color: #111111;
            }

            h1 {
                @include muro-heading(3.5rem, 800);
            }

            h2 {
                @include muro-heading(2.75rem, 750);
            }

            h3 {
                @include muro-heading(2rem, 700);
            }

            code, pre {
                font-family: $muro-font-mono;
            }

            .muro-prose {
                @include muro-copy;
            }

            .x2s-prose {
                @include muro-copy;
            }

            .muro-balance {
                text-wrap: balance;
            }

            .x2s-balance {
                text-wrap: balance;
            }

            .muro-kicker {
                font-family: $muro-font-sans;
                font-size: 0.875rem;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
            }

            .x2s-kicker {
                font-family: $muro-font-sans;
                font-size: 0.875rem;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
            }
        `
    },
    {
        id: 'muro:all',
        aliases: ['@muro/all', 'x2s:all', '@x2s/all'],
        source: `
            @import "muro:reset";
            @import "muro:grid";
            @import "muro:typography";
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

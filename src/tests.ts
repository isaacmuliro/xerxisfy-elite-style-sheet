const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Buffer } = require('buffer');

import { compileEntry, compileString } from './index';

function assertIncludes(haystack: string, needle: string): void {
    assert.ok(
        haystack.includes(needle),
        `Expected CSS to include "${needle}"\n\n${haystack}`
    );
}

function assertExcludes(haystack: string, needle: string): void {
    assert.ok(
        !haystack.includes(needle),
        `Expected CSS to exclude "${needle}"\n\n${haystack}`
    );
}

function testCompilerCore(): void {
    const source = `
        $brand: #224466;

        @mixin card($radius: 8px) {
            border-radius: $radius;
            display: flex;
        }

        .panel {
            @include card(12px);
            layer: modal;
            color: light(#111111) dark(#f5f5f5);
            user-select: none;

            &:hover {
                color: $brand;
            }
        }

        .button {
            background: $brand;
        }

        .button--primary {
            @extend .button;
        }

        @for $i from 1 through 2 {
            .col-#{$i} {
                width: math(100% / 2);
            }
        }
    `;

    const result = compileString(source, 'core.x2s', { dedupe: false });
    assertIncludes(result.css, '.panel {');
    assertIncludes(result.css, 'border-radius: 12px;');
    assertIncludes(result.css, 'display: -webkit-box;');
    assertIncludes(result.css, 'z-index: 3000;');
    assertIncludes(result.css, '@media (prefers-color-scheme: dark)');
    assertIncludes(result.css, '.panel:hover {');
    assertIncludes(result.css, '.button, .button--primary {');
    assertIncludes(result.css, '.col-1 {');
    assertIncludes(result.css, 'width: 50%;');
}

function testProjectCompileAndPurge(): void {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'x2s-project-'));
    const stylesRoot = path.join(tempRoot, 'styles');
    const contentRoot = path.join(tempRoot, 'content');

    fs.mkdirSync(stylesRoot, { recursive: true });
    fs.mkdirSync(contentRoot, { recursive: true });

    fs.writeFileSync(path.join(stylesRoot, '_tokens.x2s'), '$accent: #ff5500;', 'utf8');
    fs.writeFileSync(path.join(stylesRoot, 'main.x2s'), `
        @import "./_tokens";

        .used-card {
            background: $accent;
            display: flex;
        }

        .used-pill {
            background: $accent;
            display: flex;
        }

        .ghost-rule {
            color: red;
        }
    `, 'utf8');

    fs.writeFileSync(path.join(contentRoot, 'index.html'), `
        <div class="used-card used-pill"></div>
    `, 'utf8');

    const result = compileEntry(stylesRoot, {
        purgeContent: [contentRoot],
        cwd: tempRoot
    });

    assertIncludes(result.css, '.used-card, .used-pill {');
    assertIncludes(result.css, 'display: -webkit-box;');
    assertExcludes(result.css, '.ghost-rule');
}

function testXerxGuard(): void {
    const source = `
        .brand-button {
            color: #111111;
            @lock color;
        }

        .brand-button {
            color: #ffffff;
        }
    `;

    assert.throws(() => {
        compileString(source, 'guard.x2s', { dedupe: false });
    }, /Xerx Guard blocked override/);
}

function testComments(): void {
    const source = `
        # top-level note
        ** shared comment block
           still ignored **
        $brand: #224466;

        #hero {
            color: $brand;
        }

        .button {
            // one-line comment
            # block note
            color: #ffffff;
            ** inline block comment **
            background: $brand;
        }
    `;

    const result = compileString(source, 'comments.x2s');
    assertIncludes(result.css, '#hero {');
    assertIncludes(result.css, '.button {');
    assertIncludes(result.css, 'color: #ffffff;');
    assertIncludes(result.css, 'background: #224466;');
    assertExcludes(result.css, 'shared comment block');
    assertExcludes(result.css, 'block note');
}

function testSourceMaps(): void {
    const source = `
        $brand: #224466;

        .button {
            color: $brand;
            hyphens: auto;
        }
    `;

    const result = compileString(source, 'maps.x2s', {
        sourceMap: true,
        outputFile: 'maps.css'
    });

    assert.ok(result.sourceMap, 'Expected a source map to be generated');
    assert.strictEqual(result.sourceMap!.file, 'maps.css');
    assert.ok(result.sourceMap!.sources.indexOf('maps.x2s') !== -1, 'Expected maps.x2s in source map sources');
    assert.ok(result.sourceMap!.sourcesContent[0].indexOf('$brand') !== -1, 'Expected source contents to be embedded');
    assert.ok(result.sourceMap!.mappings.length > 0, 'Expected non-empty source map mappings');
    assertIncludes(result.css, '-webkit-hyphens: auto;');
}

function testContextVariables(): void {
    const source = `
        $primary: #224466;

        @context header {
            $primary: darken($primary, 20%);
        }

        @context footer {
            $primary: lighten($primary, 20%);
        }

        header {
            color: $primary;

            .title {
                border-color: $primary;
            }

            .local {
                $primary: #ff0000;
                color: $primary;
            }
        }

        footer {
            color: $primary;
        }

        main {
            color: $primary;
        }
    `;

    const result = compileString(source, 'context.x2s');
    assertIncludes(result.css, 'header {');
    assertIncludes(result.css, 'color: #1b3652;');
    assertIncludes(result.css, 'header .title {');
    assertIncludes(result.css, 'border-color: #1b3652;');
    assertIncludes(result.css, 'footer {');
    assertIncludes(result.css, 'color: #4e6985;');
    assertIncludes(result.css, 'main {');
    assertIncludes(result.css, 'color: #224466;');
    assertIncludes(result.css, 'header .local {');
    assertIncludes(result.css, 'color: #ff0000;');
}

function testSharedUtilities(): void {
    const source = `
        .card {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .badge {
            display: flex;
            align-items: center;
            padding: 4px;
        }
    `;

    const result = compileString(source, 'utilities.x2s');
    assertIncludes(result.css, '.x2s-u-1, .card, .badge {');
    assertIncludes(result.css, '--x2s-u-1-align-items-');
    assertIncludes(result.css, 'align-items: var(--x2s-u-1-align-items-');
    assertIncludes(result.css, 'gap: 1rem;');
    assertIncludes(result.css, 'padding: 4px;');
}

function testBuiltInModules(): void {
    const source = `
        @import "x2s:reset";
        @import "@x2s/grid";
        @import "x2s:typography";

        .layout {
            @include x2s-container(80rem, 2rem);
        }

        .layout-row {
            @include x2s-row(2rem);
        }

        .copy {
            @include x2s-copy(72ch);
        }
    `;

    const result = compileString(source, 'builtins.x2s');
    assertIncludes(result.css, '*, *::before, *::after {');
    assertIncludes(result.css, '.x2s-container {');
    assertIncludes(result.css, '.x2s-span-6 {');
    assertIncludes(result.css, 'width: 50%;');
    assertIncludes(result.css, 'h1 {');
    assertIncludes(result.css, '.layout {');
    assertIncludes(result.css, 'padding-inline: 2rem;');
    assertIncludes(result.css, '.layout-row {');
    assertIncludes(result.css, 'gap: 2rem;');
    assertIncludes(result.css, '.copy {');
    assertIncludes(result.css, 'max-width: 72ch;');
}

function testPolyfillsAndContainerMath(): void {
    const source = `
        .layout {
            inline-size: ci(75%);
            max-inline-size: cmin(50% - 1rem);
            block-size: cb(100% / 2);
            margin-inline: 1rem 2rem;
            padding-block: 8px 12px;
            inset: 1rem 2rem 3rem 4rem;
            place-items: center start;
            gap: 1rem;
            overflow: clip;
            filter: blur(6px);
            mask-image: linear-gradient(#000000, transparent);
            text-decoration-skip-ink: auto;
        }
    `;

    const result = compileString(source, 'polyfills.x2s');
    assertIncludes(result.css, '.layout {');
    assertIncludes(result.css, 'width: 75cqi;');
    assertIncludes(result.css, 'inline-size: 75cqi;');
    assertIncludes(result.css, 'max-width: calc(50cqmin - 1rem);');
    assertIncludes(result.css, 'max-inline-size: calc(50cqmin - 1rem);');
    assertIncludes(result.css, 'height: 50cqb;');
    assertIncludes(result.css, 'block-size: 50cqb;');
    assertIncludes(result.css, 'margin-left: 1rem;');
    assertIncludes(result.css, 'margin-right: 2rem;');
    assertIncludes(result.css, 'padding-top: 8px;');
    assertIncludes(result.css, 'padding-bottom: 12px;');
    assertIncludes(result.css, 'top: 1rem;');
    assertIncludes(result.css, 'right: 2rem;');
    assertIncludes(result.css, 'bottom: 3rem;');
    assertIncludes(result.css, 'left: 4rem;');
    assertIncludes(result.css, 'align-items: center;');
    assertIncludes(result.css, 'justify-items: start;');
    assertIncludes(result.css, 'grid-gap: 1rem;');
    assertIncludes(result.css, 'overflow: hidden;');
    assertIncludes(result.css, 'overflow: clip;');
    assertIncludes(result.css, '-webkit-filter: blur(6px);');
    assertIncludes(result.css, '-webkit-mask-image: linear-gradient(#000000, transparent);');
    assertIncludes(result.css, '-webkit-text-decoration-skip: ink;');
}

function testAssetConversion(): void {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'x2s-assets-'));
    const sourceFile = path.join(tempRoot, 'app.x2s');
    const imageFile = path.join(tempRoot, 'hero.png');
    const outputFile = path.join(tempRoot, 'dist', 'app.css');
    const converterFile = path.join(tempRoot, 'fake-webp.sh');

    fs.writeFileSync(imageFile, Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z6V8AAAAASUVORK5CYII=',
        'base64'
    ));
    fs.writeFileSync(sourceFile, `
        .hero {
            background-image: url("./hero.png");
        }
    `, 'utf8');
    fs.writeFileSync(converterFile, '#!/bin/sh\ncp "$1" "$2"\n', { mode: 0o755 });

    const previousConverter = process.env.X2S_WEBP_CONVERTER;
    process.env.X2S_WEBP_CONVERTER = converterFile;

    try {
        const result = compileString(fs.readFileSync(sourceFile, 'utf8'), sourceFile, {
            cwd: tempRoot,
            outputFile
        });

        assertIncludes(result.css, 'background-image: url("./x2s-assets/hero-');
        assertIncludes(result.css, '.webp");');
        assert.strictEqual(result.warnings.length, 0);

        const assetsDirectory = path.join(tempRoot, 'dist', 'x2s-assets');
        const emittedAssets = fs.readdirSync(assetsDirectory);
        assert.strictEqual(emittedAssets.length, 1);
        assert.ok(emittedAssets[0].endsWith('.webp'), `Expected a .webp asset, received ${emittedAssets[0]}`);
    } finally {
        if (previousConverter === undefined) {
            delete process.env.X2S_WEBP_CONVERTER;
        } else {
            process.env.X2S_WEBP_CONVERTER = previousConverter;
        }
    }
}

function testRejectsMarkdownFences(): void {
    const source = `
        .button {
            color: red;
        }

        \`\`\`x2s
        .card {
            color: blue;
        }
        \`\`\`
    `;

    assert.throws(() => {
        compileString(source, 'markdown.x2s');
    }, /Markdown\/code fences are not valid X2S syntax/);
}

function run(): void {
    testCompilerCore();
    testProjectCompileAndPurge();
    testXerxGuard();
    testComments();
    testSourceMaps();
    testContextVariables();
    testSharedUtilities();
    testBuiltInModules();
    testPolyfillsAndContainerMath();
    testAssetConversion();
    testRejectsMarkdownFences();
    console.log('All X2S tests passed.');
}

run();

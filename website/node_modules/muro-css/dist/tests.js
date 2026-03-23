"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Buffer } = require('buffer');
const index_1 = require("./index");
function assertIncludes(haystack, needle) {
    assert.ok(haystack.includes(needle), `Expected CSS to include "${needle}"\n\n${haystack}`);
}
function assertExcludes(haystack, needle) {
    assert.ok(!haystack.includes(needle), `Expected CSS to exclude "${needle}"\n\n${haystack}`);
}
function testCompilerCore() {
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
    const result = (0, index_1.compileString)(source, 'core.mss', { dedupe: false });
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
function testProjectCompileAndPurge() {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'muro-project-'));
    const stylesRoot = path.join(tempRoot, 'styles');
    const contentRoot = path.join(tempRoot, 'content');
    fs.mkdirSync(stylesRoot, { recursive: true });
    fs.mkdirSync(contentRoot, { recursive: true });
    fs.writeFileSync(path.join(stylesRoot, '_tokens.mss'), '$accent: #ff5500;', 'utf8');
    fs.writeFileSync(path.join(stylesRoot, 'main.mss'), `
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
    const result = (0, index_1.compileEntry)(stylesRoot, {
        purgeContent: [contentRoot],
        cwd: tempRoot
    });
    assertIncludes(result.css, '.used-card, .used-pill {');
    assertIncludes(result.css, 'display: -webkit-box;');
    assertExcludes(result.css, '.ghost-rule');
}
function testMuroGuard() {
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
        (0, index_1.compileString)(source, 'guard.mss', { dedupe: false });
    }, /Muro Guard blocked override/);
}
function testComments() {
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
    const result = (0, index_1.compileString)(source, 'comments.mss');
    assertIncludes(result.css, '#hero {');
    assertIncludes(result.css, '.button {');
    assertIncludes(result.css, 'color: #ffffff;');
    assertIncludes(result.css, 'background: #224466;');
    assertExcludes(result.css, 'shared comment block');
    assertExcludes(result.css, 'block note');
}
function testSourceMaps() {
    const source = `
        $brand: #224466;

        .button {
            color: $brand;
            hyphens: auto;
        }
    `;
    const result = (0, index_1.compileString)(source, 'maps.mss', {
        sourceMap: true,
        outputFile: 'maps.css'
    });
    assert.ok(result.sourceMap, 'Expected a source map to be generated');
    assert.strictEqual(result.sourceMap.file, 'maps.css');
    assert.ok(result.sourceMap.sources.indexOf('maps.mss') !== -1, 'Expected maps.mss in source map sources');
    assert.ok(result.sourceMap.sourcesContent[0].indexOf('$brand') !== -1, 'Expected source contents to be embedded');
    assert.ok(result.sourceMap.mappings.length > 0, 'Expected non-empty source map mappings');
    assertIncludes(result.css, '-webkit-hyphens: auto;');
}
function testContextVariables() {
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
    const result = (0, index_1.compileString)(source, 'context.mss');
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
function testSharedUtilities() {
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
    const result = (0, index_1.compileString)(source, 'utilities.mss');
    assertIncludes(result.css, '.muro-u-1, .card, .badge {');
    assertIncludes(result.css, '--muro-u-1-align-items-');
    assertIncludes(result.css, 'align-items: var(--muro-u-1-align-items-');
    assertIncludes(result.css, 'gap: 1rem;');
    assertIncludes(result.css, 'padding: 4px;');
}
function testBuiltInModules() {
    const source = `
        @import "muro:reset";
        @import "@muro/grid";
        @import "x2s:typography";

        .layout {
            @include muro-container(80rem, 2rem);
        }

        .legacy-layout {
            @include x2s-container(72rem, 1.5rem);
        }

        .copy {
            @include muro-copy(72ch);
        }

        .legacy-copy {
            @include x2s-copy(60ch);
        }
    `;
    const result = (0, index_1.compileString)(source, 'builtins.mss');
    assertIncludes(result.css, '*, *::before, *::after {');
    assertIncludes(result.css, '.muro-container');
    assertIncludes(result.css, '.x2s-container');
    assertIncludes(result.css, '.muro-span-6');
    assertIncludes(result.css, '.x2s-span-6');
    assertIncludes(result.css, '.layout {');
    assertIncludes(result.css, 'padding-inline: 2rem;');
    assertIncludes(result.css, '.legacy-layout {');
    assertIncludes(result.css, 'padding-inline: 1.5rem;');
    assertIncludes(result.css, '.copy {');
    assertIncludes(result.css, 'max-width: 72ch;');
    assertIncludes(result.css, '.legacy-copy {');
    assertIncludes(result.css, 'max-width: 60ch;');
}
function testImportPreferenceAndLegacyExtensions() {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'muro-imports-'));
    const sourceFile = path.join(tempRoot, 'main.mss');
    const legacySourceFile = path.join(tempRoot, 'legacy.x2s');
    fs.writeFileSync(path.join(tempRoot, '_tokens.mss'), '$tone: #112233;', 'utf8');
    fs.writeFileSync(path.join(tempRoot, '_tokens.x2s'), '$tone: #445566;', 'utf8');
    fs.writeFileSync(sourceFile, `
        @import "./_tokens";

        .tone {
            color: $tone;
        }
    `, 'utf8');
    fs.writeFileSync(legacySourceFile, `
        @import "./_tokens";

        .legacy-tone {
            color: $tone;
        }
    `, 'utf8');
    const modernResult = (0, index_1.compileString)(fs.readFileSync(sourceFile, 'utf8'), sourceFile);
    const legacyResult = (0, index_1.compileString)(fs.readFileSync(legacySourceFile, 'utf8'), legacySourceFile);
    assertIncludes(modernResult.css, 'color: #112233;');
    assertIncludes(legacyResult.css, 'color: #112233;');
}
function testPolyfillsAndContainerMath() {
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
    const result = (0, index_1.compileString)(source, 'polyfills.mss');
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
function runAssetConversionWithEnv(envVar) {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'muro-assets-'));
    const sourceFile = path.join(tempRoot, 'app.mss');
    const imageFile = path.join(tempRoot, 'hero.png');
    const outputFile = path.join(tempRoot, 'dist', 'app.css');
    const converterFile = path.join(tempRoot, 'fake-webp.sh');
    fs.writeFileSync(imageFile, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z6V8AAAAASUVORK5CYII=', 'base64'));
    fs.writeFileSync(sourceFile, `
        .hero {
            background-image: url("./hero.png");
        }
    `, 'utf8');
    fs.writeFileSync(converterFile, '#!/bin/sh\ncp "$1" "$2"\n', { mode: 0o755 });
    const previousPrimary = process.env.MURO_WEBP_CONVERTER;
    const previousLegacy = process.env.X2S_WEBP_CONVERTER;
    delete process.env.MURO_WEBP_CONVERTER;
    delete process.env.X2S_WEBP_CONVERTER;
    process.env[envVar] = converterFile;
    try {
        const result = (0, index_1.compileString)(fs.readFileSync(sourceFile, 'utf8'), sourceFile, {
            cwd: tempRoot,
            outputFile
        });
        assertIncludes(result.css, 'background-image: url("./muro-assets/hero-');
        assertIncludes(result.css, '.webp");');
        assert.strictEqual(result.warnings.length, 0);
        const assetsDirectory = path.join(tempRoot, 'dist', 'muro-assets');
        const emittedAssets = fs.readdirSync(assetsDirectory);
        assert.strictEqual(emittedAssets.length, 1);
        assert.ok(emittedAssets[0].endsWith('.webp'), `Expected a .webp asset, received ${emittedAssets[0]}`);
    }
    finally {
        if (previousPrimary === undefined) {
            delete process.env.MURO_WEBP_CONVERTER;
        }
        else {
            process.env.MURO_WEBP_CONVERTER = previousPrimary;
        }
        if (previousLegacy === undefined) {
            delete process.env.X2S_WEBP_CONVERTER;
        }
        else {
            process.env.X2S_WEBP_CONVERTER = previousLegacy;
        }
    }
}
function testAssetConversion() {
    runAssetConversionWithEnv('MURO_WEBP_CONVERTER');
    runAssetConversionWithEnv('X2S_WEBP_CONVERTER');
}
function testRejectsMarkdownFences() {
    const source = `
        .button {
            color: red;
        }

        \`\`\`mss
        .card {
            color: blue;
        }
        \`\`\`
    `;
    assert.throws(() => {
        (0, index_1.compileString)(source, 'markdown.mss');
    }, /Markdown\/code fences are not valid Muro Style Sheet syntax/);
}
function testLegacyCompatibility() {
    const source = `
        @import "x2s:grid";
        @import "@x2s/typography";

        .legacy-layout {
            @include x2s-container(64rem, 1rem);
        }

        .legacy-copy {
            @include x2s-copy(48ch);
        }
    `;
    const result = (0, index_1.compileString)(source, 'legacy.x2s');
    assertIncludes(result.css, '.legacy-layout {');
    assertIncludes(result.css, 'padding-inline: var(--muro-u-');
    assertIncludes(result.css, '.legacy-copy {');
    assertIncludes(result.css, 'max-width: 48ch;');
}
function testCliAndPackageMetadata() {
    const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
    assert.strictEqual(packageJson.name, 'muro-css');
    assert.strictEqual(packageJson.bin.muro, 'dist/index.js');
    assert.strictEqual(packageJson.bin.x2s, 'dist/index.js');
    const cliPath = path.resolve(__dirname, 'index.js');
    const usageRun = childProcess.spawnSync(process.execPath, [cliPath], { encoding: 'utf8' });
    assert.strictEqual(usageRun.status, 1);
    assertIncludes(usageRun.stdout, 'Usage: muro <input-file-or-directory> [output.css] [options]');
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'muro-cli-'));
    const stylesRoot = path.join(tempRoot, 'styles');
    fs.mkdirSync(stylesRoot, { recursive: true });
    fs.writeFileSync(path.join(stylesRoot, 'app.mss'), `
        .panel {
            display: flex;
        }
    `, 'utf8');
    const compileRun = childProcess.spawnSync(process.execPath, [cliPath, stylesRoot], {
        cwd: tempRoot,
        encoding: 'utf8'
    });
    assert.strictEqual(compileRun.status, 0, compileRun.stderr);
    assertIncludes(compileRun.stdout, `compiled 1 rules -> ${path.join(stylesRoot, 'muro.css')}`);
    assert.ok(fs.existsSync(path.join(stylesRoot, 'muro.css')), 'Expected muro.css to be emitted for directory compilation');
    const cliSource = fs.readFileSync(cliPath, 'utf8');
    assertIncludes(cliSource, '\\.(mss|x2s|html|js|jsx|ts|tsx)');
}
function run() {
    testCompilerCore();
    testProjectCompileAndPurge();
    testMuroGuard();
    testComments();
    testSourceMaps();
    testContextVariables();
    testSharedUtilities();
    testBuiltInModules();
    testImportPreferenceAndLegacyExtensions();
    testPolyfillsAndContainerMath();
    testAssetConversion();
    testRejectsMarkdownFences();
    testLegacyCompatibility();
    testCliAndPackageMetadata();
    console.log('All Muro tests passed.');
}
run();

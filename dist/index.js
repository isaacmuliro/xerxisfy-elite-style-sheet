#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileString = exports.compileEntry = exports.Compiler = void 0;
const compiler_1 = require("./compiler");
Object.defineProperty(exports, "Compiler", { enumerable: true, get: function () { return compiler_1.Compiler; } });
const helpers_1 = require("./utils/helpers");
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const WATCHABLE_PATTERN = /\.(x2s|html|js|jsx|ts|tsx)$/i;
function compileEntry(entryPath, options = {}) {
    const compiler = new compiler_1.Compiler({
        ...options,
        cwd: options.cwd || process.cwd()
    });
    return compiler.compileEntry(entryPath);
}
exports.compileEntry = compileEntry;
function compileString(source, filePath = 'inline.x2s', options = {}) {
    const compiler = new compiler_1.Compiler({
        ...options,
        cwd: options.cwd || process.cwd()
    });
    return compiler.compileString(source, filePath);
}
exports.compileString = compileString;
function defaultOutputPath(entryPath) {
    const absolutePath = (0, helpers_1.normalizePath)(entryPath);
    const stats = fs.statSync(absolutePath);
    if (stats.isDirectory()) {
        return path.join(absolutePath, 'x2s.css');
    }
    return absolutePath.replace(/\.x2s$/i, '.css');
}
function sourceMapOutputPath(outputPath) {
    return `${outputPath}.map`;
}
function buildOutputArtifacts(result, outputPath, options) {
    if (!result.sourceMap) {
        return { css: result.css };
    }
    const sourceMapText = JSON.stringify(result.sourceMap, null, options.minify ? 0 : 2);
    const commentPrefix = result.css.endsWith('\n') ? '' : '\n';
    if (options.inlineSourceMap) {
        const encoded = Buffer.from(sourceMapText, 'utf8').toString('base64');
        return {
            css: `${result.css}${commentPrefix}/*# sourceMappingURL=data:application/json;charset=utf-8;base64,${encoded} */\n`
        };
    }
    const mapPath = sourceMapOutputPath(outputPath);
    return {
        css: `${result.css}${commentPrefix}/*# sourceMappingURL=${path.basename(mapPath)} */\n`,
        sourceMapPath: mapPath,
        sourceMapText
    };
}
function runCompilation(entryPath, outputPath, options) {
    const compiler = new compiler_1.Compiler({
        ...options,
        cwd: options.cwd || process.cwd(),
        outputFile: outputPath
    });
    const result = compiler.compileEntry(entryPath);
    const artifacts = buildOutputArtifacts(result, outputPath, options);
    (0, helpers_1.ensureDirectory)(outputPath);
    fs.writeFileSync(outputPath, artifacts.css, 'utf8');
    if (artifacts.sourceMapPath && artifacts.sourceMapText) {
        (0, helpers_1.ensureDirectory)(artifacts.sourceMapPath);
        fs.writeFileSync(artifacts.sourceMapPath, artifacts.sourceMapText, 'utf8');
    }
    return {
        result,
        dependencies: compiler.getDependencyPaths()
    };
}
function printUsage() {
    console.log([
        'Usage: x2s <input-file-or-directory> [output.css] [options]',
        '',
        'Options:',
        '  --watch, -w       Rebuild on change',
        '  --minify, -m      Minify the generated CSS',
        '  --sourcemap       Emit an external .css.map file',
        '  --inline-sourcemap Embed the source map as a data URL',
        '  --asset-dir <dir> Write generated .webp assets to a custom directory',
        '  --purge <paths>   Comma-separated content paths for ghost purging',
        '  --no-assets       Disable automatic .webp asset processing',
        '  --no-dedupe       Disable repeated-rule deduplication'
    ].join('\n'));
}
function collectDirectories(rootPath) {
    const directories = [];
    const absoluteRoot = (0, helpers_1.normalizePath)(rootPath);
    if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) {
        return directories;
    }
    directories.push(absoluteRoot);
    const entries = fs.readdirSync(absoluteRoot, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }
        directories.push(...collectDirectories(path.join(absoluteRoot, entry.name)));
    }
    return directories;
}
function collectContentFiles(rootPath) {
    const extensions = ['.html', '.js', '.jsx', '.ts', '.tsx'];
    const files = [];
    extensions.forEach(extension => {
        files.push(...(0, helpers_1.walkDirectory)(rootPath, extension, true));
    });
    return files.map((filePath) => (0, helpers_1.normalizePath)(filePath));
}
function collectWatchTargets(entryPath, dependencies, purgeContent, outputPath, cwd) {
    const targets = new Set();
    const absoluteOutput = (0, helpers_1.normalizePath)(outputPath);
    const absoluteEntry = (0, helpers_1.normalizePath)(entryPath);
    if (fs.existsSync(absoluteEntry) && fs.statSync(absoluteEntry).isDirectory()) {
        collectDirectories(absoluteEntry).forEach(directory => targets.add(directory));
    }
    dependencies.forEach(filePath => {
        const absolutePath = (0, helpers_1.normalizePath)(filePath);
        if (absolutePath !== absoluteOutput && fs.existsSync(absolutePath)) {
            targets.add(absolutePath);
        }
    });
    purgeContent.forEach(contentPath => {
        const absolutePath = (0, helpers_1.normalizePath)(path.resolve(cwd, contentPath));
        if (!fs.existsSync(absolutePath)) {
            return;
        }
        const stats = fs.statSync(absolutePath);
        if (stats.isDirectory()) {
            collectDirectories(absolutePath).forEach(directory => targets.add(directory));
            collectContentFiles(absolutePath).forEach(filePath => {
                if (filePath !== absoluteOutput) {
                    targets.add(filePath);
                }
            });
            return;
        }
        if (absolutePath !== absoluteOutput) {
            targets.add(absolutePath);
        }
    });
    return Array.from(targets);
}
function watchProject(entryPath, outputPath, options) {
    let watchers = [];
    let timer = null;
    let lastWatchTargets = collectWatchTargets(entryPath, [entryPath], options.purgeContent || [], outputPath, options.cwd || process.cwd());
    const closeWatchers = () => {
        watchers.forEach(watcher => watcher.close());
        watchers = [];
    };
    const attachWatchers = (targets) => {
        const absoluteOutput = (0, helpers_1.normalizePath)(outputPath);
        targets.forEach(targetPath => {
            if (!fs.existsSync(targetPath)) {
                return;
            }
            const absoluteTarget = (0, helpers_1.normalizePath)(targetPath);
            const isDirectory = fs.statSync(absoluteTarget).isDirectory();
            const watcher = fs.watch(absoluteTarget, { persistent: true }, (_eventType, filename) => {
                if (filename) {
                    const changedPath = (0, helpers_1.normalizePath)(path.resolve(isDirectory ? absoluteTarget : path.dirname(absoluteTarget), filename));
                    if (changedPath === absoluteOutput) {
                        return;
                    }
                    if (isDirectory && path.extname(changedPath) && !WATCHABLE_PATTERN.test(changedPath)) {
                        return;
                    }
                    if (!isDirectory && !WATCHABLE_PATTERN.test(absoluteTarget)) {
                        return;
                    }
                }
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(recompile, 120);
            });
            watchers.push(watcher);
        });
    };
    const recompile = () => {
        closeWatchers();
        try {
            const { result, dependencies } = runCompilation(entryPath, outputPath, options);
            console.log(`compiled ${result.rules} rules -> ${outputPath}`);
            result.warnings.forEach((warning) => console.warn(`warning: ${warning}`));
            lastWatchTargets = collectWatchTargets(entryPath, dependencies, options.purgeContent || [], outputPath, options.cwd || process.cwd());
        }
        catch (error) {
            console.error(error instanceof Error ? error.message : String(error));
        }
        finally {
            attachWatchers(lastWatchTargets);
        }
    };
    recompile();
}
if (require.main === module) {
    const args = (0, helpers_1.parseCliArguments)(process.argv);
    if (!args.entry) {
        printUsage();
        process.exit(1);
    }
    const entry = args.entry;
    const entryPath = (0, helpers_1.normalizePath)(entry);
    const outputPath = (0, helpers_1.normalizePath)(args.output || defaultOutputPath(entryPath));
    const options = {
        minify: args.minify,
        dedupe: args.dedupe,
        assets: args.assets,
        assetOutputDir: args.assetOutputDir,
        sourceMap: args.sourceMap,
        inlineSourceMap: args.inlineSourceMap,
        purgeContent: args.purgeContent,
        cwd: process.cwd()
    };
    if (args.watch) {
        watchProject(entryPath, outputPath, options);
    }
    else {
        try {
            const { result } = runCompilation(entryPath, outputPath, options);
            console.log(`compiled ${result.rules} rules -> ${outputPath}`);
            result.warnings.forEach((warning) => console.warn(`warning: ${warning}`));
        }
        catch (error) {
            console.error(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    }
}

const fs = require('fs');
const path = require('path');

import { LEGACY_STYLE_EXTENSION, PRIMARY_STYLE_EXTENSION } from '../constants';

interface CliOptions {
    entry?: string;
    output?: string;
    watch: boolean;
    minify: boolean;
    dedupe: boolean;
    assets: boolean;
    assetOutputDir?: string;
    purgeContent: string[];
    sourceMap: boolean;
    inlineSourceMap: boolean;
}

export function formatString(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
}

export function validateInput(input: string): boolean {
    return input.trim().length > 0;
}

export function normalizePath(filePath: string): string {
    return path.resolve(filePath);
}

export function ensureDirectory(filePath: string): void {
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

export function walkDirectory(rootPath: string, extension: string, includePartials: boolean = false): string[] {
    const files: string[] = [];

    if (!fs.existsSync(rootPath)) {
        return files;
    }

    const entries = fs.readdirSync(rootPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkDirectory(fullPath, extension, includePartials));
            continue;
        }

        if (!entry.name.endsWith(extension)) {
            continue;
        }

        if (!includePartials && path.basename(entry.name).startsWith('_')) {
            continue;
        }

        files.push(fullPath);
    }

    return files.sort((left, right) => left.localeCompare(right));
}

export function resolveImportPath(importPath: string, fromFile: string): string {
    const baseDirectory = path.dirname(fromFile);
    const rawTarget = path.isAbsolute(importPath) ? importPath : path.resolve(baseDirectory, importPath);
    const ext = path.extname(rawTarget);
    const candidates = [
        rawTarget,
        ext ? '' : `${rawTarget}${PRIMARY_STYLE_EXTENSION}`,
        ext ? '' : path.join(path.dirname(rawTarget), `_${path.basename(rawTarget)}${PRIMARY_STYLE_EXTENSION}`),
        ext ? '' : path.join(rawTarget, `index${PRIMARY_STYLE_EXTENSION}`),
        ext ? '' : `${rawTarget}${LEGACY_STYLE_EXTENSION}`,
        ext ? '' : path.join(path.dirname(rawTarget), `_${path.basename(rawTarget)}${LEGACY_STYLE_EXTENSION}`),
        ext ? '' : path.join(rawTarget, `index${LEGACY_STYLE_EXTENSION}`)
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    throw new Error(`Unable to resolve import "${importPath}" from ${fromFile}`);
}

export function discoverEntries(entryPath: string): string[] {
    const absoluteEntry = normalizePath(entryPath);

    if (!fs.existsSync(absoluteEntry)) {
        throw new Error(`Input path does not exist: ${absoluteEntry}`);
    }

    const stats = fs.statSync(absoluteEntry);
    if (stats.isDirectory()) {
        const discovered = [
            ...walkDirectory(absoluteEntry, PRIMARY_STYLE_EXTENSION, false),
            ...walkDirectory(absoluteEntry, LEGACY_STYLE_EXTENSION, false)
        ];
        if (discovered.length === 0) {
            throw new Error(`No ${PRIMARY_STYLE_EXTENSION} or ${LEGACY_STYLE_EXTENSION} files found in ${absoluteEntry}`);
        }
        return discovered;
    }

    if (!absoluteEntry.endsWith(PRIMARY_STYLE_EXTENSION) && !absoluteEntry.endsWith(LEGACY_STYLE_EXTENSION)) {
        throw new Error(`Expected a ${PRIMARY_STYLE_EXTENSION} or ${LEGACY_STYLE_EXTENSION} file or directory, received ${absoluteEntry}`);
    }

    return [absoluteEntry];
}

export function splitByComma(input: string): string[] {
    const items: string[] = [];
    let quote = '';
    let depth = 0;
    let bracketDepth = 0;
    let current = '';

    for (let i = 0; i < input.length; i += 1) {
        const char = input[i];

        if (quote) {
            current += char;
            if (char === '\\' && i + 1 < input.length) {
                current += input[i + 1];
                i += 1;
                continue;
            }
            if (char === quote) {
                quote = '';
            }
            continue;
        }

        if (char === '"' || char === '\'') {
            quote = char;
            current += char;
            continue;
        }

        if (char === '(') {
            depth += 1;
            current += char;
            continue;
        }

        if (char === ')') {
            depth = Math.max(depth - 1, 0);
            current += char;
            continue;
        }

        if (char === '[') {
            bracketDepth += 1;
            current += char;
            continue;
        }

        if (char === ']') {
            bracketDepth = Math.max(bracketDepth - 1, 0);
            current += char;
            continue;
        }

        if (char === ',' && depth === 0 && bracketDepth === 0) {
            if (current.trim()) {
                items.push(current.trim());
            }
            current = '';
            continue;
        }

        current += char;
    }

    if (current.trim()) {
        items.push(current.trim());
    }

    return items;
}

export function parseCliArguments(argv: string[]): CliOptions {
    const args = argv.slice(2);
    const options: CliOptions = {
        watch: false,
        minify: false,
        dedupe: true,
        assets: true,
        purgeContent: [],
        sourceMap: false,
        inlineSourceMap: false
    };

    for (let i = 0; i < args.length; i += 1) {
        const value = args[i];

        if (value === '--watch' || value === '-w') {
            options.watch = true;
            continue;
        }

        if (value === '--minify' || value === '-m') {
            options.minify = true;
            continue;
        }

        if (value === '--no-dedupe') {
            options.dedupe = false;
            continue;
        }

        if (value === '--no-assets') {
            options.assets = false;
            continue;
        }

        if (value === '--sourcemap' || value === '--map') {
            options.sourceMap = true;
            continue;
        }

        if (value === '--inline-sourcemap') {
            options.inlineSourceMap = true;
            options.sourceMap = true;
            continue;
        }

        if ((value === '--output' || value === '-o') && args[i + 1]) {
            options.output = args[i + 1];
            i += 1;
            continue;
        }

        if (value === '--asset-dir' && args[i + 1]) {
            options.assetOutputDir = args[i + 1];
            i += 1;
            continue;
        }

        if (value === '--purge' && args[i + 1]) {
            options.purgeContent.push(...splitByComma(args[i + 1]));
            i += 1;
            continue;
        }

        if (!options.entry) {
            options.entry = value;
            continue;
        }

        if (!options.output) {
            options.output = value;
            continue;
        }
    }

    return options;
}

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
export declare function formatString(input: string): string;
export declare function validateInput(input: string): boolean;
export declare function normalizePath(filePath: string): string;
export declare function ensureDirectory(filePath: string): void;
export declare function walkDirectory(rootPath: string, extension: string, includePartials?: boolean): string[];
export declare function resolveImportPath(importPath: string, fromFile: string): string;
export declare function discoverEntries(entryPath: string): string[];
export declare function splitByComma(input: string): string[];
export declare function parseCliArguments(argv: string[]): CliOptions;
export {};

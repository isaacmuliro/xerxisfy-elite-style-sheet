import { SourceLocation, SourceMapData } from './types';
declare class SourceMapBuilder {
    private readonly mappingsByLine;
    private readonly sourceIndexes;
    private readonly sources;
    private readonly outputFile;
    private readonly sourceContents;
    private generatedLine;
    private generatedColumn;
    private previousGeneratedColumn;
    private previousSourceIndex;
    private previousOriginalLine;
    private previousOriginalColumn;
    constructor(sourceContents: Map<string, string>, outputFile?: string);
    addMapping(source: SourceLocation): void;
    append(text: string): void;
    build(): SourceMapData;
    private ensureSource;
    private ensureLine;
    private normalizeSourcePath;
}
export { SourceMapBuilder };

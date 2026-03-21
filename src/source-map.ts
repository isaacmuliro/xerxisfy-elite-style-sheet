const path = require('path');

import { SourceLocation, SourceMapData } from './types';

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeBase64Vlq(value: number): string {
    let encoded = '';
    let vlq = value < 0 ? ((-value) << 1) + 1 : value << 1;

    do {
        let digit = vlq & 31;
        vlq >>>= 5;
        if (vlq > 0) {
            digit |= 32;
        }
        encoded += BASE64_ALPHABET[digit];
    } while (vlq > 0);

    return encoded;
}

class SourceMapBuilder {
    private readonly mappingsByLine: string[];
    private readonly sourceIndexes: Map<string, number>;
    private readonly sources: string[];
    private readonly outputFile: string;
    private readonly sourceContents: Map<string, string>;
    private generatedLine: number;
    private generatedColumn: number;
    private previousGeneratedColumn: number;
    private previousSourceIndex: number;
    private previousOriginalLine: number;
    private previousOriginalColumn: number;

    constructor(sourceContents: Map<string, string>, outputFile?: string) {
        this.mappingsByLine = [''];
        this.sourceIndexes = new Map<string, number>();
        this.sources = [];
        this.outputFile = outputFile || 'output.css';
        this.sourceContents = sourceContents;
        this.generatedLine = 0;
        this.generatedColumn = 0;
        this.previousGeneratedColumn = 0;
        this.previousSourceIndex = 0;
        this.previousOriginalLine = 0;
        this.previousOriginalColumn = 0;
    }

    public addMapping(source: SourceLocation): void {
        this.ensureLine();

        const sourceIndex = this.ensureSource(source.file);
        const line = this.mappingsByLine[this.generatedLine];
        const segment = [
            encodeBase64Vlq(this.generatedColumn - this.previousGeneratedColumn),
            encodeBase64Vlq(sourceIndex - this.previousSourceIndex),
            encodeBase64Vlq((source.line - 1) - this.previousOriginalLine),
            encodeBase64Vlq((source.column - 1) - this.previousOriginalColumn)
        ].join('');

        this.mappingsByLine[this.generatedLine] = line ? `${line},${segment}` : segment;
        this.previousGeneratedColumn = this.generatedColumn;
        this.previousSourceIndex = sourceIndex;
        this.previousOriginalLine = source.line - 1;
        this.previousOriginalColumn = source.column - 1;
    }

    public append(text: string): void {
        for (let index = 0; index < text.length; index += 1) {
            if (text[index] === '\n') {
                this.generatedLine += 1;
                this.generatedColumn = 0;
                this.previousGeneratedColumn = 0;
                this.ensureLine();
                continue;
            }

            this.generatedColumn += 1;
        }
    }

    public build(): SourceMapData {
        return {
            version: 3,
            file: path.basename(this.outputFile),
            sources: this.sources.map(sourcePath => this.normalizeSourcePath(sourcePath)),
            sourcesContent: this.sources.map(sourcePath => this.sourceContents.get(sourcePath) || ''),
            names: [],
            mappings: this.mappingsByLine.join(';')
        };
    }

    private ensureSource(sourcePath: string): number {
        const existing = this.sourceIndexes.get(sourcePath);
        if (existing !== undefined) {
            return existing;
        }

        const index = this.sources.length;
        this.sources.push(sourcePath);
        this.sourceIndexes.set(sourcePath, index);
        return index;
    }

    private ensureLine(): void {
        while (this.mappingsByLine.length <= this.generatedLine) {
            this.mappingsByLine.push('');
        }
    }

    private normalizeSourcePath(sourcePath: string): string {
        if (!path.isAbsolute(sourcePath)) {
            return sourcePath;
        }

        const relativePath = path.relative(path.dirname(this.outputFile), sourcePath);
        return relativePath || path.basename(sourcePath);
    }
}

export { SourceMapBuilder };

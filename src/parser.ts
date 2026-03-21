import {
    AtRuleNode,
    DeclarationNode,
    EachNode,
    ExtendNode,
    ForNode,
    IfNode,
    ImportNode,
    IncludeNode,
    LayersNode,
    LockNode,
    MixinNode,
    MixinParameter,
    RuleNode,
    SourceLocation,
    StatementNode,
    StylesheetNode,
    VariableDeclarationNode
} from './types';

class Parser {
    private readonly source: string;
    private readonly filePath: string;
    private readonly lineStarts: number[];
    private index: number;

    constructor(source: string, filePath: string = 'inline.x2s') {
        this.source = source;
        this.filePath = filePath;
        this.index = 0;
        this.lineStarts = [0];

        for (let i = 0; i < source.length; i += 1) {
            if (source[i] === '\n') {
                this.lineStarts.push(i + 1);
            }
        }
    }

    public parse(): StylesheetNode {
        const invalidBacktick = this.source.indexOf('`');
        if (invalidBacktick !== -1) {
            throw new Error(
                this.formatError('Unexpected "`". Markdown/code fences are not valid X2S syntax', invalidBacktick)
            );
        }

        return {
            type: 'Stylesheet',
            body: this.parseStatements(),
            source: this.getLocation(0)
        };
    }

    private parseStatements(untilBrace: boolean = false): StatementNode[] {
        const statements: StatementNode[] = [];

        while (this.index < this.source.length) {
            this.skipWhitespaceAndComments();

            if (this.index >= this.source.length) {
                break;
            }

            if (untilBrace && this.source[this.index] === '}') {
                this.index += 1;
                break;
            }

            if (!untilBrace && this.source[this.index] === '}') {
                throw new Error(this.formatError('Unexpected closing brace', this.index));
            }

            const statement = this.parseStatement();
            if (statement) {
                statements.push(statement);
            }
        }

        return statements;
    }

    private parseStatement(): StatementNode {
        const start = this.index;
        const marker = this.findTopLevelDelimiter([':', ';', '{']);
        const head = this.source.slice(start, marker.index).trim();

        if (!head) {
            if (marker.delimiter === ';') {
                this.index = marker.index + 1;
                return this.parseStatement();
            }
            throw new Error(this.formatError('Empty statement', this.index));
        }

        if (marker.delimiter === ':') {
            this.index = marker.index + 1;
            const trailingMarker = this.findTopLevelDelimiter([';', '{']);

            if (trailingMarker.delimiter === '{') {
                const selectorHead = this.source.slice(start, trailingMarker.index).trim();
                this.index = trailingMarker.index + 1;
                const block = this.readBlockContent();
                return this.buildBlockStatement(selectorHead, block, this.getLocation(start));
            }

            const value = this.source.slice(this.index, trailingMarker.index);
            this.index = trailingMarker.index + 1;
            return this.buildDeclaration(head, value, this.getLocation(start));
        }

        if (marker.delimiter === ';') {
            this.index = marker.index + 1;
            return this.buildInlineStatement(head, this.getLocation(start));
        }

        if (marker.delimiter === '{') {
            this.index = marker.index + 1;
            const block = this.readBlockContent();
            return this.buildBlockStatement(head, block, this.getLocation(start));
        }

        throw new Error(this.formatError('Unterminated statement', start));
    }

    private buildDeclaration(head: string, value: string, source: SourceLocation): DeclarationNode | VariableDeclarationNode {
        if (head.startsWith('$')) {
            return {
                type: 'VariableDeclaration',
                name: head,
                value: value.trim(),
                source
            };
        }

        return {
            type: 'Declaration',
            property: head.trim(),
            value: value.trim(),
            source
        };
    }

    private buildInlineStatement(head: string, source: SourceLocation): StatementNode {
        if (!head.startsWith('@')) {
            throw new Error(this.formatError(`Unexpected inline statement "${head}"`, this.index));
        }

        const directive = this.splitDirective(head);

        switch (directive.name) {
            case '@import':
                return this.parseImport(directive.body, source);
            case '@include':
                return this.parseInclude(directive.body, source);
            case '@extend':
                return this.parseExtend(directive.body, source);
            case '@layers':
                return this.parseLayers(directive.body, source);
            case '@lock':
                return this.parseLock(directive.body, source);
            default:
                return {
                    type: 'AtRule',
                    name: directive.name,
                    prelude: directive.body,
                    source
                };
        }
    }

    private buildBlockStatement(head: string, block: string, source: SourceLocation): StatementNode {
        if (!head.startsWith('@')) {
            return {
                type: 'Rule',
                selector: head,
                body: new Parser(block, this.filePath).parse().body,
                source
            };
        }

        const directive = this.splitDirective(head);

        switch (directive.name) {
            case '@mixin':
                return this.parseMixin(directive.body, block, source);
            case '@if':
                return this.parseIf(directive.body, block, source);
            case '@each':
                return this.parseEach(directive.body, block, source);
            case '@for':
                return this.parseFor(directive.body, block, source);
            default:
                return {
                    type: 'AtRule',
                    name: directive.name,
                    prelude: directive.body,
                    body: new Parser(block, this.filePath).parse().body,
                    source
                };
        }
    }

    private parseImport(body: string, source: SourceLocation): ImportNode {
        return {
            type: 'Import',
            path: this.stripQuotes(body.trim()),
            source
        };
    }

    private parseInclude(body: string, source: SourceLocation): IncludeNode {
        const openParen = body.indexOf('(');
        if (openParen === -1) {
            return {
                type: 'Include',
                name: body.trim(),
                args: [],
                source
            };
        }

        const closeParen = body.lastIndexOf(')');
        const name = body.slice(0, openParen).trim();
        const args = this.splitCommaList(body.slice(openParen + 1, closeParen));

        return {
            type: 'Include',
            name,
            args,
            source
        };
    }

    private parseExtend(body: string, source: SourceLocation): ExtendNode {
        return {
            type: 'Extend',
            selector: body.trim(),
            source
        };
    }

    private parseLayers(body: string, source: SourceLocation): LayersNode {
        return {
            type: 'Layers',
            names: this.splitCommaList(body),
            source
        };
    }

    private parseLock(body: string, source: SourceLocation): LockNode {
        const [targetPart, propertiesPart] = body.includes('=>')
            ? body.split(/\s*=>\s*/, 2)
            : ['', body];

        return {
            type: 'Lock',
            target: targetPart.trim() || undefined,
            properties: this.splitCommaList(propertiesPart),
            source
        };
    }

    private parseMixin(body: string, block: string, source: SourceLocation): MixinNode {
        const openParen = body.indexOf('(');
        let name = body.trim();
        let params: MixinParameter[] = [];

        if (openParen !== -1) {
            const closeParen = body.lastIndexOf(')');
            name = body.slice(0, openParen).trim();
            params = this.splitCommaList(body.slice(openParen + 1, closeParen)).map(raw => {
                const [paramName, defaultValue] = raw.split(/\s*:\s*/, 2);
                return {
                    name: paramName.trim(),
                    defaultValue: defaultValue ? defaultValue.trim() : undefined
                };
            });
        }

        return {
            type: 'Mixin',
            name,
            params,
            body: new Parser(block, this.filePath).parse().body,
            source
        };
    }

    private parseIf(condition: string, block: string, source: SourceLocation): IfNode {
        const consequent = new Parser(block, this.filePath).parse().body;
        const alternate = this.tryParseElse();

        return {
            type: 'If',
            condition: condition.trim(),
            consequent,
            alternate,
            source
        };
    }

    private parseEach(body: string, block: string, source: SourceLocation): EachNode {
        const match = body.match(/^(\$[\w-]+)\s+in\s+(.+)$/);
        if (!match) {
            throw new Error(this.formatError(`Invalid @each directive "${body}"`, this.index));
        }

        return {
            type: 'Each',
            variable: match[1],
            items: this.splitCommaList(match[2]),
            body: new Parser(block, this.filePath).parse().body,
            source
        };
    }

    private parseFor(body: string, block: string, source: SourceLocation): ForNode {
        const match = body.match(/^(\$[\w-]+)\s+from\s+(.+?)\s+(through|to)\s+(.+)$/);
        if (!match) {
            throw new Error(this.formatError(`Invalid @for directive "${body}"`, this.index));
        }

        return {
            type: 'For',
            variable: match[1],
            from: match[2].trim(),
            to: match[4].trim(),
            inclusive: match[3] === 'through',
            body: new Parser(block, this.filePath).parse().body,
            source
        };
    }

    private tryParseElse(): StatementNode[] | undefined {
        const checkpoint = this.index;
        this.skipWhitespaceAndComments();

        if (!this.source.startsWith('@else', this.index)) {
            this.index = checkpoint;
            return undefined;
        }

        const start = this.index;
        const marker = this.findTopLevelDelimiter(['{']);
        const head = this.source.slice(start, marker.index).trim();
        if (!head.startsWith('@else')) {
            this.index = checkpoint;
            return undefined;
        }

        this.index = marker.index + 1;
        const block = this.readBlockContent();
        const suffix = head.slice('@else'.length).trim();

        if (!suffix) {
            return new Parser(block, this.filePath).parse().body;
        }

        if (suffix.startsWith('if ')) {
            return [
                this.parseIf(suffix.slice(3).trim(), block, this.getLocation(start))
            ];
        }

        throw new Error(this.formatError(`Invalid @else clause "${head}"`, start));
    }

    private readUntil(delimiter: string): string {
        const marker = this.findTopLevelDelimiter([delimiter]);
        const value = this.source.slice(this.index, marker.index);
        this.index = marker.index + 1;
        return value;
    }

    private readBlockContent(): string {
        const start = this.index;
        let depth = 1;
        let interpolationDepth = 0;
        let quote = '';
        let i = this.index;

        while (i < this.source.length) {
            const char = this.source[i];
            const next = this.source[i + 1] || '';

            if (quote) {
                if (char === '\\') {
                    i += 2;
                    continue;
                }

                if (char === quote) {
                    quote = '';
                }

                i += 1;
                continue;
            }

            if (char === '/' && next === '/') {
                i = this.skipComment(i, 'line');
                continue;
            }

            if (char === '/' && next === '*') {
                i = this.skipComment(i, 'css-block');
                continue;
            }

            if (char === '*' && next === '*') {
                i = this.skipComment(i, 'x2s-block');
                continue;
            }

            if (this.isHashCommentStart(i)) {
                i = this.skipComment(i, 'line');
                continue;
            }

            if (char === '"' || char === '\'') {
                quote = char;
                i += 1;
                continue;
            }

            if (char === '#' && next === '{') {
                interpolationDepth += 1;
                i += 2;
                continue;
            }

            if (char === '{') {
                depth += 1;
                i += 1;
                continue;
            }

            if (char === '}') {
                if (interpolationDepth > 0) {
                    interpolationDepth -= 1;
                    i += 1;
                    continue;
                }
                depth -= 1;
                if (depth === 0) {
                    const content = this.source.slice(start, i);
                    this.index = i + 1;
                    return content;
                }
            }

            i += 1;
        }

        throw new Error(this.formatError('Unclosed block', start));
    }

    private findTopLevelDelimiter(delimiters: string[]): { index: number; delimiter: string } {
        let quote = '';
        let parenDepth = 0;
        let bracketDepth = 0;
        let interpolationDepth = 0;
        let i = this.index;

        while (i < this.source.length) {
            const char = this.source[i];
            const next = this.source[i + 1] || '';

            if (quote) {
                if (char === '\\') {
                    i += 2;
                    continue;
                }

                if (char === quote) {
                    quote = '';
                }

                i += 1;
                continue;
            }

            if (char === '/' && next === '/') {
                i = this.skipComment(i, 'line');
                continue;
            }

            if (char === '/' && next === '*') {
                i = this.skipComment(i, 'css-block');
                continue;
            }

            if (char === '*' && next === '*') {
                i = this.skipComment(i, 'x2s-block');
                continue;
            }

            if (this.isHashCommentStart(i)) {
                i = this.skipComment(i, 'line');
                continue;
            }

            if (char === '"' || char === '\'') {
                quote = char;
                i += 1;
                continue;
            }

            if (char === '#' && next === '{') {
                interpolationDepth += 1;
                i += 2;
                continue;
            }

            if (char === '(') {
                parenDepth += 1;
                i += 1;
                continue;
            }

            if (char === ')') {
                parenDepth = Math.max(parenDepth - 1, 0);
                i += 1;
                continue;
            }

            if (char === '[') {
                bracketDepth += 1;
                i += 1;
                continue;
            }

            if (char === ']') {
                bracketDepth = Math.max(bracketDepth - 1, 0);
                i += 1;
                continue;
            }

            if (char === '}' && interpolationDepth > 0) {
                interpolationDepth -= 1;
                i += 1;
                continue;
            }

            if (parenDepth === 0 && bracketDepth === 0 && interpolationDepth === 0 && delimiters.includes(char)) {
                return { index: i, delimiter: char };
            }

            i += 1;
        }

        return { index: this.source.length, delimiter: '' };
    }

    private splitDirective(head: string): { name: string; body: string } {
        const match = head.match(/^(@[\w-]+)\s*(.*)$/);
        if (!match) {
            throw new Error(this.formatError(`Invalid directive "${head}"`, this.index));
        }

        return {
            name: match[1],
            body: match[2].trim()
        };
    }

    private splitCommaList(input: string): string[] {
        const items: string[] = [];
        let quote = '';
        let parenDepth = 0;
        let bracketDepth = 0;
        let interpolationDepth = 0;
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

            if (char === '#' && input[i + 1] === '{') {
                interpolationDepth += 1;
                current += '#{';
                i += 1;
                continue;
            }

            if (char === '(') {
                parenDepth += 1;
                current += char;
                continue;
            }

            if (char === ')') {
                parenDepth = Math.max(parenDepth - 1, 0);
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

            if (char === '}' && interpolationDepth > 0) {
                interpolationDepth -= 1;
                current += char;
                continue;
            }

            if (char === ',' && parenDepth === 0 && bracketDepth === 0 && interpolationDepth === 0) {
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

    private stripQuotes(value: string): string {
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
            return value.slice(1, -1);
        }

        return value;
    }

    private skipWhitespaceAndComments(): void {
        while (this.index < this.source.length) {
            const char = this.source[this.index];
            const next = this.source[this.index + 1] || '';

            if (/\s/.test(char)) {
                this.index += 1;
                continue;
            }

            if (char === '/' && next === '/') {
                this.index = this.skipComment(this.index, 'line');
                continue;
            }

            if (char === '/' && next === '*') {
                this.index = this.skipComment(this.index, 'css-block');
                continue;
            }

            if (char === '*' && next === '*') {
                this.index = this.skipComment(this.index, 'x2s-block');
                continue;
            }

            if (this.isHashCommentStart(this.index)) {
                this.index = this.skipComment(this.index, 'line');
                continue;
            }

            break;
        }
    }

    private skipComment(start: number, type: 'line' | 'css-block' | 'x2s-block'): number {
        if (type === 'line') {
            let i = start;
            while (i < this.source.length && this.source[i] !== '\n') {
                i += 1;
            }
            return i;
        }

        const closing = type === 'css-block' ? '*/' : '**';
        let i = start + 2;
        while (i < this.source.length - 1) {
            if (this.source[i] === closing[0] && this.source[i + 1] === closing[1]) {
                return i + 2;
            }
            i += 1;
        }
        return this.source.length;
    }

    private isHashCommentStart(index: number): boolean {
        if (this.source[index] !== '#' || this.source[index + 1] === '{') {
            return false;
        }

        const next = this.source[index + 1] || '';
        if (next && !/\s/.test(next)) {
            return false;
        }

        let cursor = index - 1;
        while (cursor >= 0 && this.source[cursor] !== '\n') {
            if (!/\s/.test(this.source[cursor])) {
                return false;
            }
            cursor -= 1;
        }

        return true;
    }

    private getLocation(index: number): SourceLocation {
        let low = 0;
        let high = this.lineStarts.length - 1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (this.lineStarts[mid] <= index) {
                if (mid === this.lineStarts.length - 1 || this.lineStarts[mid + 1] > index) {
                    return {
                        file: this.filePath,
                        line: mid + 1,
                        column: index - this.lineStarts[mid] + 1
                    };
                }
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return {
            file: this.filePath,
            line: 1,
            column: 1
        };
    }

    private formatError(message: string, index: number): string {
        const location = this.getLocation(index);
        return `${message} at ${location.file}:${location.line}:${location.column}`;
    }
}

export { Parser };

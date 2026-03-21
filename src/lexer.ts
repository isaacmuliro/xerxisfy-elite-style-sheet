import { Token } from './types';

class Lexer {
    private readonly input: string;
    private index: number;
    private line: number;
    private column: number;

    constructor(input: string) {
        this.input = input;
        this.index = 0;
        this.line = 1;
        this.column = 1;
    }

    public tokenize(): Token[] {
        const tokens: Token[] = [];

        while (this.index < this.input.length) {
            const char = this.input[this.index];
            const next = this.input[this.index + 1] || '';

            if (this.isWhitespace(char)) {
                this.advance(char);
                continue;
            }

            if (char === '/' && next === '/') {
                this.skipLineComment();
                continue;
            }

            if (char === '/' && next === '*') {
                this.skipBlockComment();
                continue;
            }

            if (char === '*' && next === '*') {
                this.skipStarComment();
                continue;
            }

            if (this.isHashCommentStart()) {
                this.skipLineComment();
                continue;
            }

            if (char === '"' || char === '\'') {
                tokens.push(this.readString(char));
                continue;
            }

            if (this.isSymbol(char)) {
                tokens.push(this.makeToken('symbol', char));
                this.advance(char);
                continue;
            }

            tokens.push(this.readWord());
        }

        return tokens;
    }

    private readString(quote: string): Token {
        const startLine = this.line;
        const startColumn = this.column;
        let value = quote;

        this.advance(quote);

        while (this.index < this.input.length) {
            const char = this.input[this.index];
            value += char;
            this.advance(char);

            if (char === '\\') {
                const escaped = this.input[this.index] || '';
                value += escaped;
                this.advance(escaped);
                continue;
            }

            if (char === quote) {
                break;
            }
        }

        return {
            type: 'string',
            value,
            line: startLine,
            column: startColumn
        };
    }

    private readWord(): Token {
        const startLine = this.line;
        const startColumn = this.column;
        let value = '';

        while (this.index < this.input.length) {
            const char = this.input[this.index];
            const next = this.input[this.index + 1] || '';

            if (this.isWhitespace(char) || this.isSymbol(char)) {
                break;
            }

            if (char === '/' && (next === '/' || next === '*')) {
                break;
            }

            if (char === '*' && next === '*') {
                break;
            }

            if (char === '#' && this.isHashCommentStart()) {
                break;
            }

            value += char;
            this.advance(char);
        }

        return {
            type: 'word',
            value,
            line: startLine,
            column: startColumn
        };
    }

    private skipLineComment(): void {
        while (this.index < this.input.length) {
            const char = this.input[this.index];
            this.advance(char);
            if (char === '\n') {
                break;
            }
        }
    }

    private skipBlockComment(): void {
        this.advance('/');
        this.advance('*');

        while (this.index < this.input.length) {
            const char = this.input[this.index];
            const next = this.input[this.index + 1] || '';
            this.advance(char);

            if (char === '*' && next === '/') {
                this.advance('/');
                break;
            }
        }
    }

    private skipStarComment(): void {
        this.advance('*');
        this.advance('*');

        while (this.index < this.input.length) {
            const char = this.input[this.index];
            const next = this.input[this.index + 1] || '';
            this.advance(char);

            if (char === '*' && next === '*') {
                this.advance('*');
                break;
            }
        }
    }

    private makeToken(type: Token['type'], value: string): Token {
        return {
            type,
            value,
            line: this.line,
            column: this.column
        };
    }

    private isWhitespace(char: string): boolean {
        return /\s/.test(char);
    }

    private isHashCommentStart(): boolean {
        if (this.input[this.index] !== '#' || this.input[this.index + 1] === '{') {
            return false;
        }

        const next = this.input[this.index + 1] || '';
        if (next && !/\s/.test(next)) {
            return false;
        }

        let cursor = this.index - 1;
        while (cursor >= 0 && this.input[cursor] !== '\n') {
            if (!/\s/.test(this.input[cursor])) {
                return false;
            }
            cursor -= 1;
        }

        return true;
    }

    private isSymbol(char: string): boolean {
        return '{}:;(),[]'.includes(char);
    }

    private advance(char: string): void {
        this.index += 1;
        if (char === '\n') {
            this.line += 1;
            this.column = 1;
            return;
        }

        this.column += 1;
    }
}

export { Lexer };

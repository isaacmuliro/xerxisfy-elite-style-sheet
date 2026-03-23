import { Token } from './types';
declare class Lexer {
    private readonly input;
    private index;
    private line;
    private column;
    constructor(input: string);
    tokenize(): Token[];
    private readString;
    private readWord;
    private skipLineComment;
    private skipBlockComment;
    private skipStarComment;
    private makeToken;
    private isWhitespace;
    private isHashCommentStart;
    private isSymbol;
    private advance;
}
export { Lexer };

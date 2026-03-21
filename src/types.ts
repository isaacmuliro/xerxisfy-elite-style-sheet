export interface SourceLocation {
    file: string;
    line: number;
    column: number;
}

export interface StylesheetNode {
    type: 'Stylesheet';
    body: StatementNode[];
    source: SourceLocation;
}

export interface RuleNode {
    type: 'Rule';
    selector: string;
    body: StatementNode[];
    source: SourceLocation;
}

export interface DeclarationNode {
    type: 'Declaration';
    property: string;
    value: string;
    source: SourceLocation;
}

export interface VariableDeclarationNode {
    type: 'VariableDeclaration';
    name: string;
    value: string;
    source: SourceLocation;
}

export interface ImportNode {
    type: 'Import';
    path: string;
    source: SourceLocation;
}

export interface ExtendNode {
    type: 'Extend';
    selector: string;
    source: SourceLocation;
}

export interface LayersNode {
    type: 'Layers';
    names: string[];
    source: SourceLocation;
}

export interface LockNode {
    type: 'Lock';
    properties: string[];
    target?: string;
    source: SourceLocation;
}

export interface IncludeNode {
    type: 'Include';
    name: string;
    args: string[];
    source: SourceLocation;
}

export interface MixinParameter {
    name: string;
    defaultValue?: string;
}

export interface MixinNode {
    type: 'Mixin';
    name: string;
    params: MixinParameter[];
    body: StatementNode[];
    source: SourceLocation;
}

export interface IfNode {
    type: 'If';
    condition: string;
    consequent: StatementNode[];
    alternate?: StatementNode[];
    source: SourceLocation;
}

export interface EachNode {
    type: 'Each';
    variable: string;
    items: string[];
    body: StatementNode[];
    source: SourceLocation;
}

export interface ForNode {
    type: 'For';
    variable: string;
    from: string;
    to: string;
    inclusive: boolean;
    body: StatementNode[];
    source: SourceLocation;
}

export interface AtRuleNode {
    type: 'AtRule';
    name: string;
    prelude: string;
    body?: StatementNode[];
    source: SourceLocation;
}

export type StatementNode =
    | RuleNode
    | DeclarationNode
    | VariableDeclarationNode
    | ImportNode
    | ExtendNode
    | LayersNode
    | LockNode
    | IncludeNode
    | MixinNode
    | IfNode
    | EachNode
    | ForNode
    | AtRuleNode;

export interface Token {
    type: 'word' | 'string' | 'symbol';
    value: string;
    line: number;
    column: number;
}

export interface CssDeclaration {
    property: string;
    value: string;
    source: SourceLocation;
}

export interface OutputRule {
    selectors: string[];
    declarations: CssDeclaration[];
    atRules: string[];
    source: SourceLocation;
}

export interface RawOutput {
    text: string;
    source: SourceLocation;
}

export interface PendingExtend {
    selector: string;
    target: string;
    atRules: string[];
    source: SourceLocation;
}

export interface CompileOptions {
    minify?: boolean;
    dedupe?: boolean;
    purgeContent?: string[];
    cwd?: string;
    sourceMap?: boolean;
    inlineSourceMap?: boolean;
    outputFile?: string;
    assets?: boolean;
    assetOutputDir?: string;
}

export interface SourceMapData {
    version: 3;
    file: string;
    sources: string[];
    sourcesContent: string[];
    names: string[];
    mappings: string;
}

export interface CompileResult {
    css: string;
    rules: number;
    sources: string[];
    warnings: string[];
    sourceMap?: SourceMapData;
}

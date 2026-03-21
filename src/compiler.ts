const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');

import { resolveBuiltinModule } from './builtin-modules';
import { Parser } from './parser';
import { SourceMapBuilder } from './source-map';
import {
    AtRuleNode,
    CompileOptions,
    CompileResult,
    CssDeclaration,
    EachNode,
    ForNode,
    IncludeNode,
    LockNode,
    MixinNode,
    OutputRule,
    PendingExtend,
    RawOutput,
    RuleNode,
    SourceLocation,
    SourceMapData,
    StatementNode,
    StylesheetNode
} from './types';
import { discoverEntries, resolveImportPath, splitByComma, walkDirectory } from './utils/helpers';

interface Scope {
    variables: Map<string, string>;
    mixins: Map<string, MixinNode>;
    parent?: Scope;
}

interface Environment {
    scope: Scope;
    filePath: string;
}

interface CompiledStatements {
    declarations: CssDeclaration[];
    darkDeclarations: CssDeclaration[];
    pendingLocks: LockNode[];
}

interface ContextVariableScope {
    contexts: string[];
    variables: Map<string, string>;
    source: SourceLocation;
}

interface ImportReference {
    id: string;
    filePath: string;
    builtin: boolean;
}

class Compiler {
    private readonly options: Required<Pick<CompileOptions, 'minify' | 'dedupe' | 'sourceMap' | 'inlineSourceMap' | 'assets'>> & Pick<CompileOptions, 'purgeContent' | 'cwd' | 'outputFile' | 'assetOutputDir'>;
    private rules: OutputRule[];
    private rawOutputs: RawOutput[];
    private pendingExtends: PendingExtend[];
    private parsedFiles: Map<string, StylesheetNode>;
    private sourceContents: Map<string, string>;
    private sources: Set<string>;
    private dependencyPaths: Set<string>;
    private locks: Map<string, string>;
    private layerMap: Map<string, number>;
    private contextVariables: ContextVariableScope[];
    private importStack: string[];
    private utilityCounter: number;
    private warnings: Set<string>;
    private assetOutputs: Map<string, string>;

    constructor(options: CompileOptions = {}) {
        this.options = {
            minify: options.minify ?? false,
            dedupe: options.dedupe ?? true,
            sourceMap: options.sourceMap ?? false,
            inlineSourceMap: options.inlineSourceMap ?? false,
            assets: options.assets ?? true,
            purgeContent: options.purgeContent,
            cwd: options.cwd,
            outputFile: options.outputFile,
            assetOutputDir: options.assetOutputDir
        };
        this.rules = [];
        this.rawOutputs = [];
        this.pendingExtends = [];
        this.parsedFiles = new Map<string, StylesheetNode>();
        this.sourceContents = new Map<string, string>();
        this.sources = new Set<string>();
        this.dependencyPaths = new Set<string>();
        this.locks = new Map<string, string>();
        this.layerMap = this.createDefaultLayerMap();
        this.contextVariables = [];
        this.importStack = [];
        this.utilityCounter = 0;
        this.warnings = new Set<string>();
        this.assetOutputs = new Map<string, string>();
    }

    public compileEntry(entryPath: string): CompileResult {
        this.reset();
        const rootScope = this.createScope();
        const entries = discoverEntries(entryPath);

        for (const filePath of entries) {
            const stylesheet = this.loadStylesheet(filePath);
            this.processStatements(stylesheet.body, { scope: rootScope, filePath }, [], []);
        }

        return this.finalize();
    }

    public compileString(source: string, filePath: string = 'inline.x2s'): CompileResult {
        this.reset();
        const stylesheet = new Parser(source, filePath).parse();
        this.sourceContents.set(filePath, source);
        this.sources.add(filePath);
        if (fs.existsSync(filePath)) {
            this.dependencyPaths.add(path.resolve(filePath));
        }
        this.processStatements(stylesheet.body, { scope: this.createScope(), filePath }, [], []);
        return this.finalize();
    }

    public getDependencyPaths(): string[] {
        return Array.from(this.dependencyPaths);
    }

    private reset(): void {
        this.rules = [];
        this.rawOutputs = [];
        this.pendingExtends = [];
        this.parsedFiles = new Map<string, StylesheetNode>();
        this.sourceContents = new Map<string, string>();
        this.sources = new Set<string>();
        this.dependencyPaths = new Set<string>();
        this.locks = new Map<string, string>();
        this.layerMap = this.createDefaultLayerMap();
        this.contextVariables = [];
        this.importStack = [];
        this.utilityCounter = 0;
        this.warnings = new Set<string>();
        this.assetOutputs = new Map<string, string>();
    }

    private finalize(): CompileResult {
        this.resolveExtends();

        let rules = this.normalizeRules(this.rules);
        if (this.options.dedupe) {
            rules = this.dedupeRules(rules);
        }
        if (this.options.purgeContent && this.options.purgeContent.length > 0) {
            rules = this.purgeRules(rules, this.options.purgeContent);
        }
        rules = this.extractSharedUtilities(rules);

        const rendered = this.render(rules, this.rawOutputs);

        return {
            css: rendered.css,
            rules: rules.length,
            sources: Array.from(this.sources),
            warnings: Array.from(this.warnings),
            sourceMap: rendered.sourceMap
        };
    }

    private loadStylesheet(filePath: string): StylesheetNode {
        const absolutePath = path.resolve(filePath);
        const cached = this.parsedFiles.get(absolutePath);
        if (cached) {
            return cached;
        }

        const source = fs.readFileSync(absolutePath, 'utf8');
        const stylesheet = new Parser(source, absolutePath).parse();
        this.parsedFiles.set(absolutePath, stylesheet);
        this.sourceContents.set(absolutePath, source);
        this.sources.add(absolutePath);
        this.dependencyPaths.add(absolutePath);
        return stylesheet;
    }

    private loadBuiltinStylesheet(moduleId: string): StylesheetNode {
        const cached = this.parsedFiles.get(moduleId);
        if (cached) {
            return cached;
        }

        const moduleDefinition = resolveBuiltinModule(moduleId);
        if (!moduleDefinition) {
            throw new Error(`Unknown built-in module "${moduleId}"`);
        }

        const stylesheet = new Parser(moduleDefinition.source, moduleDefinition.id).parse();
        this.parsedFiles.set(moduleDefinition.id, stylesheet);
        this.sourceContents.set(moduleDefinition.id, moduleDefinition.source);
        this.sources.add(moduleDefinition.id);
        return stylesheet;
    }

    private resolveImportReference(importPath: string, fromFile: string): ImportReference {
        const builtinModule = resolveBuiltinModule(importPath);
        if (builtinModule) {
            return {
                id: builtinModule.id,
                filePath: builtinModule.id,
                builtin: true
            };
        }

        const resolvedPath = resolveImportPath(importPath, fromFile);
        const absolutePath = path.resolve(resolvedPath);
        return {
            id: absolutePath,
            filePath: absolutePath,
            builtin: false
        };
    }

    private processImportedStylesheet(
        importReference: ImportReference,
        environment: Environment,
        currentSelectors: string[],
        atRules: string[]
    ): void {
        if (this.importStack.indexOf(importReference.id) !== -1) {
            const chain = this.importStack.concat(importReference.id).join(' -> ');
            throw new Error(`Circular import detected: ${chain}`);
        }

        this.importStack.push(importReference.id);
        try {
            const imported = importReference.builtin
                ? this.loadBuiltinStylesheet(importReference.id)
                : this.loadStylesheet(importReference.filePath);
            this.processStatements(imported.body, { scope: environment.scope, filePath: importReference.filePath }, currentSelectors, atRules);
        } finally {
            this.importStack.pop();
        }
    }

    private processStatements(
        statements: StatementNode[],
        environment: Environment,
        currentSelectors: string[],
        atRules: string[]
    ): CompiledStatements {
        const declarations: CssDeclaration[] = [];
        const darkDeclarations: CssDeclaration[] = [];
        const pendingLocks: LockNode[] = [];

        for (const statement of statements) {
            switch (statement.type) {
                case 'VariableDeclaration': {
                    const resolvedValue = this.resolveValue(statement.value, environment.scope, currentSelectors);
                    environment.scope.variables.set(statement.name, resolvedValue);
                    break;
                }
                case 'Declaration': {
                    const compiled = this.compileDeclaration(
                        statement.property,
                        statement.value,
                        environment.scope,
                        statement.source,
                        currentSelectors
                    );
                    declarations.push(...compiled.base);
                    darkDeclarations.push(...compiled.dark);
                    break;
                }
                case 'Import': {
                    const importReference = this.resolveImportReference(statement.path, environment.filePath);
                    this.processImportedStylesheet(importReference, environment, currentSelectors, atRules);
                    break;
                }
                case 'Mixin':
                    environment.scope.mixins.set(statement.name, statement);
                    break;
                case 'Include': {
                    const compiled = this.expandInclude(statement, environment, currentSelectors, atRules);
                    declarations.push(...compiled.declarations);
                    darkDeclarations.push(...compiled.darkDeclarations);
                    pendingLocks.push(...compiled.pendingLocks);
                    break;
                }
                case 'Rule':
                    this.compileRule(statement, environment, currentSelectors, atRules);
                    break;
                case 'AtRule':
                    if (statement.name === '@context') {
                        this.registerContextVariables(statement, environment, currentSelectors);
                    } else {
                        this.compileAtRule(statement, environment, currentSelectors, atRules);
                    }
                    break;
                case 'If': {
                    const branch = this.evaluateCondition(statement.condition, environment.scope, currentSelectors)
                        ? statement.consequent
                        : statement.alternate || [];
                    const compiled = this.processStatements(branch, environment, currentSelectors, atRules);
                    declarations.push(...compiled.declarations);
                    darkDeclarations.push(...compiled.darkDeclarations);
                    pendingLocks.push(...compiled.pendingLocks);
                    break;
                }
                case 'Each': {
                    const compiled = this.expandEach(statement, environment, currentSelectors, atRules);
                    declarations.push(...compiled.declarations);
                    darkDeclarations.push(...compiled.darkDeclarations);
                    pendingLocks.push(...compiled.pendingLocks);
                    break;
                }
                case 'For': {
                    const compiled = this.expandFor(statement, environment, currentSelectors, atRules);
                    declarations.push(...compiled.declarations);
                    darkDeclarations.push(...compiled.darkDeclarations);
                    pendingLocks.push(...compiled.pendingLocks);
                    break;
                }
                case 'Layers':
                    this.applyLayers(statement.names, environment.scope, currentSelectors);
                    break;
                case 'Lock':
                    pendingLocks.push(statement);
                    break;
                case 'Extend': {
                    const target = this.resolveSelectorText(statement.selector, environment.scope, currentSelectors);
                    for (const selector of currentSelectors) {
                        this.pendingExtends.push({
                            selector,
                            target,
                            atRules: atRules.slice(),
                            source: statement.source
                        });
                    }
                    break;
                }
                default:
                    break;
            }
        }

        return { declarations, darkDeclarations, pendingLocks };
    }

    private registerContextVariables(
        atRule: AtRuleNode,
        environment: Environment,
        currentSelectors: string[]
    ): void {
        if (!atRule.body) {
            return;
        }

        const contexts = this.splitSelectors(this.resolveSelectorText(atRule.prelude, environment.scope, currentSelectors));
        const contextScope = this.createScope(environment.scope);
        const variables = new Map<string, string>();

        for (const statement of atRule.body) {
            if (statement.type !== 'VariableDeclaration') {
                throw new Error(`@context only supports variable declarations at ${this.formatLocation(statement.source)}`);
            }

            const value = this.resolveValue(statement.value, contextScope, contexts, false);
            contextScope.variables.set(statement.name, value);
            variables.set(statement.name, value);
        }

        if (contexts.length > 0 && variables.size > 0) {
            this.contextVariables.push({
                contexts,
                variables,
                source: atRule.source
            });
        }
    }

    private expandInclude(
        include: IncludeNode,
        environment: Environment,
        currentSelectors: string[],
        atRules: string[]
    ): CompiledStatements {
        const mixin = this.lookupMixin(environment.scope, include.name);
        if (!mixin) {
            throw new Error(`Unknown mixin "${include.name}" at ${this.formatLocation(include.source)}`);
        }

        const mixinScope = this.createScope(environment.scope);
        mixin.params.forEach((parameter, index) => {
            const value = include.args[index] ?? parameter.defaultValue;
            if (value !== undefined) {
                mixinScope.variables.set(parameter.name, this.resolveValue(value, environment.scope, currentSelectors));
            }
        });

        return this.processStatements(mixin.body, { scope: mixinScope, filePath: environment.filePath }, currentSelectors, atRules);
    }

    private expandEach(
        eachNode: EachNode,
        environment: Environment,
        currentSelectors: string[],
        atRules: string[]
    ): CompiledStatements {
        const combined: CompiledStatements = {
            declarations: [],
            darkDeclarations: [],
            pendingLocks: []
        };

        const expandedItems: string[] = [];
        eachNode.items
            .map(item => this.resolveValue(item, environment.scope, currentSelectors))
            .forEach(item => {
                expandedItems.push(...splitByComma(item));
            });

        for (const item of expandedItems) {
            const scope = this.createScope(environment.scope);
            scope.variables.set(eachNode.variable, item);
            const result = this.processStatements(eachNode.body, { scope, filePath: environment.filePath }, currentSelectors, atRules);
            combined.declarations.push(...result.declarations);
            combined.darkDeclarations.push(...result.darkDeclarations);
            combined.pendingLocks.push(...result.pendingLocks);
        }

        return combined;
    }

    private expandFor(
        forNode: ForNode,
        environment: Environment,
        currentSelectors: string[],
        atRules: string[]
    ): CompiledStatements {
        const start = Number(this.resolveValue(forNode.from, environment.scope, currentSelectors));
        const end = Number(this.resolveValue(forNode.to, environment.scope, currentSelectors));
        if (Number.isNaN(start) || Number.isNaN(end)) {
            throw new Error(`Invalid @for range at ${this.formatLocation(forNode.source)}`);
        }

        const step = start <= end ? 1 : -1;
        const limit = forNode.inclusive ? end + step : end;
        const combined: CompiledStatements = {
            declarations: [],
            darkDeclarations: [],
            pendingLocks: []
        };

        for (let value = start; value !== limit; value += step) {
            const scope = this.createScope(environment.scope);
            scope.variables.set(forNode.variable, String(value));
            const result = this.processStatements(forNode.body, { scope, filePath: environment.filePath }, currentSelectors, atRules);
            combined.declarations.push(...result.declarations);
            combined.darkDeclarations.push(...result.darkDeclarations);
            combined.pendingLocks.push(...result.pendingLocks);
        }

        return combined;
    }

    private compileRule(
        rule: RuleNode,
        environment: Environment,
        currentSelectors: string[],
        atRules: string[]
    ): void {
        const selectors = this.combineSelectors(currentSelectors, this.resolveSelectorText(rule.selector, environment.scope, currentSelectors));
        const scope = this.createScope(environment.scope);
        const compiled = this.processStatements(rule.body, { scope, filePath: environment.filePath }, selectors, atRules);

        if (compiled.declarations.length > 0) {
            this.emitRule(selectors, compiled.declarations, atRules, rule.source);
            this.registerLocks(selectors, compiled.declarations, compiled.pendingLocks, atRules, scope, rule.source);
        }

        if (compiled.darkDeclarations.length > 0) {
            const darkAtRules = atRules.concat('@media (prefers-color-scheme: dark)');
            this.emitRule(selectors, compiled.darkDeclarations, darkAtRules, rule.source);
            this.registerLocks(selectors, compiled.darkDeclarations, compiled.pendingLocks, darkAtRules, scope, rule.source);
        }
    }

    private compileAtRule(
        atRule: AtRuleNode,
        environment: Environment,
        currentSelectors: string[],
        atRules: string[]
    ): void {
        const renderedAtRule = atRule.prelude ? `${atRule.name} ${this.resolveSelectorText(atRule.prelude, environment.scope, currentSelectors)}` : atRule.name;
        if (!atRule.body) {
            this.rawOutputs.push({
                text: `${renderedAtRule};`,
                source: atRule.source
            });
            return;
        }

        const scope = this.createScope(environment.scope);
        const nestedAtRules = atRules.concat(renderedAtRule);
        const compiled = this.processStatements(atRule.body, { scope, filePath: environment.filePath }, currentSelectors, nestedAtRules);

        if (compiled.declarations.length > 0) {
            this.emitRule(currentSelectors, compiled.declarations, nestedAtRules, atRule.source);
            this.registerLocks(currentSelectors, compiled.declarations, compiled.pendingLocks, nestedAtRules, scope, atRule.source);
        }

        if (compiled.darkDeclarations.length > 0) {
            const darkAtRules = nestedAtRules.concat('@media (prefers-color-scheme: dark)');
            this.emitRule(currentSelectors, compiled.darkDeclarations, darkAtRules, atRule.source);
            this.registerLocks(currentSelectors, compiled.darkDeclarations, compiled.pendingLocks, darkAtRules, scope, atRule.source);
        }
    }

    private compileDeclaration(
        property: string,
        rawValue: string,
        scope: Scope,
        source: SourceLocation,
        currentSelectors: string[]
    ): { base: CssDeclaration[]; dark: CssDeclaration[] } {
        const resolvedProperty = this.resolveSelectorText(property, scope, currentSelectors);
        const resolvedValue = this.resolveValue(rawValue, scope, currentSelectors);
        const themed = this.extractThemePair(resolvedValue);

        if (resolvedProperty === 'layer') {
            return {
                base: [{
                    property: 'z-index',
                    value: this.resolveLayerValue(themed ? themed.light : resolvedValue),
                    source
                }],
                dark: themed
                    ? [{
                        property: 'z-index',
                        value: this.resolveLayerValue(themed.dark),
                        source
                    }]
                    : []
            };
        }

        if (themed) {
            const lightValue = this.processAssetUrls(themed.light, source);
            const darkValue = this.processAssetUrls(themed.dark, source);
            return {
                base: this.expandPrefixes(resolvedProperty, lightValue, source),
                dark: this.expandPrefixes(resolvedProperty, darkValue, source)
            };
        }

        const assetResolvedValue = this.processAssetUrls(resolvedValue, source);
        return {
            base: this.expandPrefixes(resolvedProperty, assetResolvedValue, source),
            dark: []
        };
    }

    private emitRule(selectors: string[], declarations: CssDeclaration[], atRules: string[], source: SourceLocation): void {
        const ruleSelectors = selectors.map(selector => selector.trim()).filter(Boolean);
        const ruleDeclarations = declarations.map(declaration => ({
            property: declaration.property.trim(),
            value: declaration.value.trim(),
            source: declaration.source
        }));

        if (ruleSelectors.length === 0 && ruleDeclarations.length === 0) {
            return;
        }

        for (const selector of ruleSelectors) {
            for (const declaration of ruleDeclarations) {
                const lockKey = this.createLockKey(selector, atRules, declaration.property);
                const lockedValue = this.locks.get(lockKey);
                if (lockedValue && lockedValue !== declaration.value) {
                    throw new Error(
                        `Xerx Guard blocked override of ${selector} { ${declaration.property}: ${lockedValue} } at ${this.formatLocation(source)}`
                    );
                }
            }
        }

        this.rules.push({
            selectors: ruleSelectors,
            declarations: ruleDeclarations,
            atRules: atRules.slice(),
            source
        });
    }

    private registerLocks(
        selectors: string[],
        declarations: CssDeclaration[],
        locks: LockNode[],
        atRules: string[],
        scope: Scope,
        source: SourceLocation
    ): void {
        if (locks.length === 0) {
            return;
        }

        for (const lock of locks) {
            const lockSelectors = lock.target
                ? this.combineSelectors([], this.resolveSelectorText(lock.target, scope, selectors))
                : selectors;

            for (const selector of lockSelectors) {
                for (const property of lock.properties) {
                    const resolvedProperty = this.resolveSelectorText(property, scope, [selector]);
                    const declaration = [...declarations].reverse().find(item => item.property === resolvedProperty);
                    if (!declaration) {
                        throw new Error(
                            `Unable to lock "${resolvedProperty}" for ${selector}; property not found at ${this.formatLocation(source)}`
                        );
                    }
                    this.locks.set(this.createLockKey(selector, atRules, resolvedProperty), declaration.value);
                }
            }
        }
    }

    private resolveExtends(): void {
        for (const pending of this.pendingExtends) {
            let matched = false;
            for (const rule of this.rules) {
                if (!this.sameAtRules(rule.atRules, pending.atRules)) {
                    continue;
                }

                if (!rule.selectors.includes(pending.target)) {
                    continue;
                }

                matched = true;
                if (!rule.selectors.includes(pending.selector)) {
                    rule.selectors.push(pending.selector);
                }
            }

            if (!matched) {
                throw new Error(`Unable to extend "${pending.target}" at ${this.formatLocation(pending.source)}`);
            }
        }
    }

    private normalizeRules(rules: OutputRule[]): OutputRule[] {
        return rules
            .map(rule => ({
                selectors: this.unique(rule.selectors),
                declarations: this.collapseDeclarations(rule.declarations),
                atRules: rule.atRules.slice(),
                source: rule.source
            }))
            .filter(rule => rule.declarations.length > 0 || rule.selectors.length > 0);
    }

    private dedupeRules(rules: OutputRule[]): OutputRule[] {
        const deduped: OutputRule[] = [];
        const bySignature = new Map<string, OutputRule>();

        for (const rule of rules) {
            const signature = `${rule.atRules.join('|')}::${rule.declarations
                .map(declaration => `${declaration.property}:${declaration.value}`)
                .join(';')}`;

            const existing = bySignature.get(signature);
            if (!existing) {
                const clone: OutputRule = {
                    selectors: rule.selectors.slice(),
                    declarations: rule.declarations.slice(),
                    atRules: rule.atRules.slice(),
                    source: rule.source
                };
                deduped.push(clone);
                bySignature.set(signature, clone);
                continue;
            }

            existing.selectors.push(...rule.selectors);
            existing.selectors = this.unique(existing.selectors);
        }

        return deduped;
    }

    private purgeRules(rules: OutputRule[], contentPaths: string[]): OutputRule[] {
        const usage = this.collectUsage(contentPaths);
        return rules.filter(rule => {
            if (rule.selectors.length === 0) {
                return true;
            }
            return rule.selectors.some(selector => this.isSelectorUsed(selector, usage));
        });
    }

    private extractSharedUtilities(rules: OutputRule[]): OutputRule[] {
        const groupedRuleIndexes = new Map<string, number[]>();
        rules.forEach((rule, index) => {
            const key = rule.atRules.join('|');
            const indexes = groupedRuleIndexes.get(key) || [];
            indexes.push(index);
            groupedRuleIndexes.set(key, indexes);
        });

        const insertions = new Map<number, OutputRule[]>();
        const replacements = new Map<number, Map<string, string>>();

        groupedRuleIndexes.forEach(indexes => {
            const candidateMap = new Map<string, {
                signatures: string[];
                ruleIndexes: Set<number>;
                declarations: Map<string, CssDeclaration>;
                source: SourceLocation;
            }>();

            for (let left = 0; left < indexes.length; left += 1) {
                for (let right = left + 1; right < indexes.length; right += 1) {
                    const leftRule = rules[indexes[left]];
                    const rightRule = rules[indexes[right]];
                    if (leftRule.selectors.length === 0 || rightRule.selectors.length === 0) {
                        continue;
                    }

                    const leftSignatures = this.unique(leftRule.declarations.map(declaration => this.declarationSignature(declaration)));
                    const rightSignatureSet = new Set(rightRule.declarations.map(declaration => this.declarationSignature(declaration)));
                    const intersection = leftSignatures.filter(signature => rightSignatureSet.has(signature));

                    if (intersection.length < 2) {
                        continue;
                    }

                    intersection.sort();
                    const candidateKey = intersection.join('||');
                    let candidate = candidateMap.get(candidateKey);
                    if (!candidate) {
                        const declarations = new Map<string, CssDeclaration>();
                        intersection.forEach(signature => {
                            const declaration = leftRule.declarations.find(item => this.declarationSignature(item) === signature);
                            if (declaration) {
                                declarations.set(signature, declaration);
                            }
                        });
                        candidate = {
                            signatures: intersection,
                            ruleIndexes: new Set<number>(),
                            declarations,
                            source: leftRule.source
                        };
                        candidateMap.set(candidateKey, candidate);
                    }

                    candidate.ruleIndexes.add(indexes[left]);
                    candidate.ruleIndexes.add(indexes[right]);
                }
            }

            const usedSignaturesByRule = new Map<number, Set<string>>();
            const candidates = Array.from(candidateMap.values()).sort((left, right) => {
                if (right.signatures.length !== left.signatures.length) {
                    return right.signatures.length - left.signatures.length;
                }
                return right.ruleIndexes.size - left.ruleIndexes.size;
            });

            candidates.forEach(candidate => {
                const validRuleIndexes = Array.from(candidate.ruleIndexes).filter(ruleIndex => {
                    const used = usedSignaturesByRule.get(ruleIndex);
                    return candidate.signatures.every(signature => !used || !used.has(signature));
                });

                if (validRuleIndexes.length < 2) {
                    return;
                }

                const utilityId = ++this.utilityCounter;
                const utilitySelector = `.x2s-u-${utilityId}`;
                const utilityDeclarations: CssDeclaration[] = [];
                const utilitySelectors = [utilitySelector];

                candidate.signatures.forEach((signature, index) => {
                    const declaration = candidate.declarations.get(signature);
                    if (!declaration) {
                        return;
                    }

                    const variableName = this.utilityVariableName(utilityId, declaration.property, index);
                    utilityDeclarations.push({
                        property: variableName,
                        value: declaration.value,
                        source: declaration.source
                    });

                    validRuleIndexes.forEach(ruleIndex => {
                        const replacementMap = replacements.get(ruleIndex) || new Map<string, string>();
                        replacementMap.set(signature, `var(${variableName})`);
                        replacements.set(ruleIndex, replacementMap);
                    });
                });

                validRuleIndexes.forEach(ruleIndex => {
                    const used = usedSignaturesByRule.get(ruleIndex) || new Set<string>();
                    candidate.signatures.forEach(signature => used.add(signature));
                    usedSignaturesByRule.set(ruleIndex, used);
                    utilitySelectors.push(...rules[ruleIndex].selectors);
                });

                const insertionIndex = Math.min(...validRuleIndexes);
                const utilityRules = insertions.get(insertionIndex) || [];
                utilityRules.push({
                    selectors: this.unique(utilitySelectors),
                    declarations: utilityDeclarations,
                    atRules: rules[insertionIndex].atRules.slice(),
                    source: candidate.source
                });
                insertions.set(insertionIndex, utilityRules);
            });
        });

        const output: OutputRule[] = [];
        rules.forEach((rule, index) => {
            const utilityRules = insertions.get(index);
            if (utilityRules) {
                output.push(...utilityRules);
            }

            const replacementMap = replacements.get(index);
            if (!replacementMap) {
                output.push(rule);
                return;
            }

            output.push({
                selectors: rule.selectors.slice(),
                declarations: rule.declarations.map(declaration => {
                    const replacement = replacementMap.get(this.declarationSignature(declaration));
                    return replacement
                        ? {
                            property: declaration.property,
                            value: replacement,
                            source: declaration.source
                        }
                        : declaration;
                }),
                atRules: rule.atRules.slice(),
                source: rule.source
            });
        });

        return this.normalizeRules(output);
    }

    private collectUsage(contentPaths: string[]): { classes: Set<string>; ids: Set<string>; tags: Set<string> } {
        const usage = {
            classes: new Set<string>(),
            ids: new Set<string>(),
            tags: new Set<string>()
        };

        const files: string[] = [];
        for (const contentPath of contentPaths) {
            const absolutePath = path.resolve(this.options.cwd || process.cwd(), contentPath);
            if (!fs.existsSync(absolutePath)) {
                continue;
            }

            const stats = fs.statSync(absolutePath);
            if (stats.isDirectory()) {
                files.push(...walkDirectory(absolutePath, '.html', true));
                files.push(...walkDirectory(absolutePath, '.js', true));
                files.push(...walkDirectory(absolutePath, '.jsx', true));
                files.push(...walkDirectory(absolutePath, '.ts', true));
                files.push(...walkDirectory(absolutePath, '.tsx', true));
            } else {
                files.push(absolutePath);
            }
        }

        for (const filePath of this.unique(files)) {
            const content = fs.readFileSync(filePath, 'utf8');

            this.collectRegexMatches(content, /class(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/g).forEach(match => {
                match[1].split(/\s+/).filter(Boolean).forEach((name: string) => usage.classes.add(name));
            });

            this.collectRegexMatches(content, /id\s*=\s*["'`]([^"'`]+)["'`]/g).forEach(match => {
                usage.ids.add(match[1]);
            });

            this.collectRegexMatches(content, /classList\.(?:add|remove|toggle)\(([^)]+)\)/g).forEach(match => {
                match[1]
                    .split(',')
                    .map(value => value.trim().replace(/^['"`]|['"`]$/g, ''))
                    .filter(Boolean)
                    .forEach((name: string) => usage.classes.add(name));
            });

            this.collectRegexMatches(content, /querySelector(?:All)?\(\s*["'`]([^"'`]+)["'`]\s*\)/g).forEach(match => {
                this.collectSelectorTokens(match[1], usage);
            });

            this.collectRegexMatches(content, /getElementById\(\s*["'`]([^"'`]+)["'`]\s*\)/g).forEach(match => {
                usage.ids.add(match[1]);
            });

            this.collectRegexMatches(content, /getElementsByClassName\(\s*["'`]([^"'`]+)["'`]\s*\)/g).forEach(match => {
                usage.classes.add(match[1]);
            });

            this.collectRegexMatches(content, /<([a-z][\w-]*)\b/gi).forEach(match => {
                usage.tags.add(match[1].toLowerCase());
            });
        }

        return usage;
    }

    private isSelectorUsed(
        selector: string,
        usage: { classes: Set<string>; ids: Set<string>; tags: Set<string> }
    ): boolean {
        if (/^(html|body|:root|\*)/.test(selector) || selector.includes('[')) {
            return true;
        }

        const cleaned = selector.replace(/::?[\w-]+(?:\([^)]*\))?/g, '');
        const classes = this.collectRegexMatches(cleaned, /\.([\w-]+)/g).map(match => match[1]);
        const ids = this.collectRegexMatches(cleaned, /#([\w-]+)/g).map(match => match[1]);
        const tags = this.collectRegexMatches(cleaned, /(^|[\s>+~,(])([a-z][\w-]*)/gi).map(match => match[2].toLowerCase());

        if (classes.length === 0 && ids.length === 0 && tags.length === 0) {
            return true;
        }

        return classes.some(name => usage.classes.has(name))
            || ids.some(name => usage.ids.has(name))
            || tags.some(name => usage.tags.has(name));
    }

    private collectSelectorTokens(
        selector: string,
        usage: { classes: Set<string>; ids: Set<string>; tags: Set<string> }
    ): void {
        this.collectRegexMatches(selector, /\.([\w-]+)/g).forEach(match => usage.classes.add(match[1]));
        this.collectRegexMatches(selector, /#([\w-]+)/g).forEach(match => usage.ids.add(match[1]));
        this.collectRegexMatches(selector, /(^|[\s>+~,(])([a-z][\w-]*)/gi).forEach(match => usage.tags.add(match[2].toLowerCase()));
    }

    private render(rules: OutputRule[], rawOutputs: RawOutput[]): { css: string; sourceMap?: SourceMapData } {
        const compact = this.options.minify;
        const mapBuilder = (this.options.sourceMap || this.options.inlineSourceMap)
            ? new SourceMapBuilder(this.sourceContents, this.options.outputFile)
            : undefined;
        let css = '';

        const append = (text: string, source?: SourceLocation): void => {
            if (mapBuilder && source) {
                mapBuilder.addMapping(source);
            }
            css += text;
            if (mapBuilder) {
                mapBuilder.append(text);
            }
        };

        for (const rawOutput of rawOutputs) {
            append(compact ? rawOutput.text : `${rawOutput.text}\n`, rawOutput.source);
        }

        for (const rule of rules) {
            for (const atRule of rule.atRules) {
                append(compact ? `${atRule}{` : `${atRule} {\n`, rule.source);
            }

            if (rule.selectors.length > 0) {
                append(
                    compact
                        ? `${rule.selectors.join(',')}{`
                        : `${rule.selectors.join(', ')} {\n`,
                    rule.source
                );
            }

            for (const declaration of rule.declarations) {
                append(
                    compact
                        ? `${declaration.property}:${declaration.value};`
                        : `  ${declaration.property}: ${declaration.value};\n`,
                    declaration.source
                );
            }

            if (rule.selectors.length > 0) {
                append(compact ? '}' : '}\n', rule.source);
            }

            for (let i = rule.atRules.length - 1; i >= 0; i -= 1) {
                append(compact ? '}' : '}\n', rule.source);
            }
        }

        return {
            css: compact ? css : css.trimEnd() + '\n',
            sourceMap: mapBuilder ? mapBuilder.build() : undefined
        };
    }

    private processAssetUrls(value: string, source: SourceLocation): string {
        if (!this.options.assets || !this.options.outputFile || !value.includes('url(')) {
            return value;
        }

        return value.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match: string, quote: string, rawUrl: string) => {
            const convertedUrl = this.convertAssetUrl(rawUrl.trim(), source);
            if (!convertedUrl) {
                return match;
            }

            const wrapper = quote || '';
            return `url(${wrapper}${convertedUrl}${wrapper})`;
        });
    }

    private convertAssetUrl(rawUrl: string, source: SourceLocation): string | null {
        if (!this.shouldConvertAssetUrl(rawUrl)) {
            return null;
        }

        const { pathname, suffix } = this.splitAssetUrl(rawUrl);
        const absoluteInputPath = path.resolve(path.dirname(source.file), pathname);
        if (!fs.existsSync(absoluteInputPath)) {
            this.warn(`Asset not found for WebP conversion: ${absoluteInputPath}`);
            return null;
        }

        this.dependencyPaths.add(absoluteInputPath);

        const cachedOutput = this.assetOutputs.get(absoluteInputPath);
        if (cachedOutput) {
            return `${cachedOutput}${suffix}`;
        }

        const outputFile = this.resolveOutputFilePath();
        if (!outputFile) {
            return null;
        }

        const outputDirectory = this.resolveAssetOutputDirectory(outputFile);
        const assetFileName = this.buildAssetFileName(absoluteInputPath);
        const outputAssetPath = path.join(outputDirectory, assetFileName);

        if (!this.isAssetCurrent(absoluteInputPath, outputAssetPath)) {
            fs.mkdirSync(path.dirname(outputAssetPath), { recursive: true });
            const converted = this.convertAssetToWebp(absoluteInputPath, outputAssetPath);
            if (!converted) {
                this.warn(
                    `Unable to convert ${absoluteInputPath} to WebP. Install cwebp, ImageMagick, ffmpeg, or set X2S_WEBP_CONVERTER.`
                );
                return null;
            }
        }

        let relativeOutputPath = path.relative(path.dirname(outputFile), outputAssetPath).split(path.sep).join('/');
        if (!relativeOutputPath.startsWith('.')) {
            relativeOutputPath = `./${relativeOutputPath}`;
        }

        this.assetOutputs.set(absoluteInputPath, relativeOutputPath);
        return `${relativeOutputPath}${suffix}`;
    }

    private shouldConvertAssetUrl(rawUrl: string): boolean {
        if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('#')) {
            return false;
        }

        if (/^[a-z]+:\/\//i.test(rawUrl) || rawUrl.startsWith('//') || rawUrl.startsWith('/')) {
            return false;
        }

        const { pathname } = this.splitAssetUrl(rawUrl);
        return /\.(png|jpe?g)$/i.test(pathname);
    }

    private splitAssetUrl(rawUrl: string): { pathname: string; suffix: string } {
        const match = rawUrl.match(/^([^?#]+)([?#].*)?$/);
        return {
            pathname: match ? match[1] : rawUrl,
            suffix: match && match[2] ? match[2] : ''
        };
    }

    private resolveOutputFilePath(): string | undefined {
        if (!this.options.outputFile) {
            return undefined;
        }

        return path.isAbsolute(this.options.outputFile)
            ? this.options.outputFile
            : path.resolve(this.options.cwd || process.cwd(), this.options.outputFile);
    }

    private resolveAssetOutputDirectory(outputFile: string): string {
        if (this.options.assetOutputDir) {
            return path.isAbsolute(this.options.assetOutputDir)
                ? this.options.assetOutputDir
                : path.resolve(this.options.cwd || process.cwd(), this.options.assetOutputDir);
        }

        return path.join(path.dirname(outputFile), 'x2s-assets');
    }

    private buildAssetFileName(inputPath: string): string {
        const parsed = path.parse(inputPath);
        const hash = crypto.createHash('sha1').update(inputPath).digest('hex').slice(0, 8);
        return `${parsed.name}-${hash}.webp`;
    }

    private isAssetCurrent(inputPath: string, outputPath: string): boolean {
        if (!fs.existsSync(outputPath)) {
            return false;
        }

        return fs.statSync(outputPath).mtimeMs >= fs.statSync(inputPath).mtimeMs;
    }

    private convertAssetToWebp(inputPath: string, outputPath: string): boolean {
        const customConverter = process.env.X2S_WEBP_CONVERTER;
        if (customConverter && this.runAssetConverter(customConverter, [inputPath, outputPath])) {
            return true;
        }

        const candidates = [
            { command: 'cwebp', args: ['-quiet', inputPath, '-o', outputPath] },
            { command: 'magick', args: [inputPath, '-quality', '82', outputPath] },
            { command: 'ffmpeg', args: ['-y', '-loglevel', 'error', '-i', inputPath, outputPath] }
        ];

        for (const candidate of candidates) {
            if (this.runAssetConverter(candidate.command, candidate.args)) {
                return true;
            }
        }

        return false;
    }

    private runAssetConverter(command: string, args: string[]): boolean {
        const result = childProcess.spawnSync(command, args, { stdio: 'ignore' });
        return !result.error && result.status === 0 && fs.existsSync(args[args.length - 1]);
    }

    private warn(message: string): void {
        this.warnings.add(message);
    }

    private combineSelectors(parentSelectors: string[], selectorText: string): string[] {
        const children = this.splitSelectors(selectorText);
        if (parentSelectors.length === 0) {
            return children;
        }

        const combined: string[] = [];
        for (const parent of parentSelectors) {
            for (const child of children) {
                if (child.includes('&')) {
                    combined.push(child.replace(/&/g, parent).trim());
                    continue;
                }
                combined.push(`${parent} ${child}`.trim());
            }
        }

        return combined;
    }

    private splitSelectors(selectorText: string): string[] {
        return splitByComma(selectorText).map(selector => selector.trim()).filter(Boolean);
    }

    private resolveSelectorText(text: string, scope: Scope, currentSelectors: string[] = []): string {
        return this.interpolate(text, scope, currentSelectors).replace(/\s+/g, ' ').trim();
    }

    private resolveValue(rawValue: string, scope: Scope, currentSelectors: string[] = [], useContextVariables: boolean = true): string {
        let value = this.interpolate(rawValue, scope, currentSelectors, useContextVariables);
        value = this.applyFunction(value, 'cw', args => this.containerUnit(args[0], 'cqw', 'cw'));
        value = this.applyFunction(value, 'ch', args => this.containerUnit(args[0], 'cqh', 'ch'));
        value = this.applyFunction(value, 'ci', args => this.containerUnit(args[0], 'cqi', 'ci'));
        value = this.applyFunction(value, 'cb', args => this.containerUnit(args[0], 'cqb', 'cb'));
        value = this.applyFunction(value, 'cmin', args => this.containerUnit(args[0], 'cqmin', 'cmin'));
        value = this.applyFunction(value, 'cmax', args => this.containerUnit(args[0], 'cqmax', 'cmax'));
        value = this.applyFunction(value, 'lighten', args => this.adjustColor(args[0], args[1], 'lighten'));
        value = this.applyFunction(value, 'darken', args => this.adjustColor(args[0], args[1], 'darken'));
        value = this.applyFunction(value, 'alpha', args => this.applyAlpha(args[0], args[1]));
        value = this.applyFunction(value, 'mix', args => this.mixColors(args[0], args[1], args[2]));
        value = this.applyFunction(value, 'math', args => this.evaluateMath(args[0]));
        return value.replace(/\s+/g, ' ').trim();
    }

    private interpolate(input: string, scope: Scope, currentSelectors: string[] = [], useContextVariables: boolean = true): string {
        let value = input;
        value = value.replace(
            /#\{\s*(\$[\w-]+)\s*\}/g,
            (_match: string, variable: string) => this.lookupVariable(scope, variable, currentSelectors, useContextVariables) ?? variable
        );
        value = value.replace(
            /\$[\w-]+/g,
            (variable: string) => this.lookupVariable(scope, variable, currentSelectors, useContextVariables) ?? variable
        );
        return value;
    }

    private lookupVariable(
        scope: Scope,
        name: string,
        currentSelectors: string[] = [],
        useContextVariables: boolean = true
    ): string | undefined {
        let current: Scope | undefined = scope;
        let rootValue: string | undefined;
        while (current) {
            const value = current.variables.get(name);
            if (value !== undefined) {
                if (current.parent) {
                    return value;
                }
                rootValue = value;
            }
            current = current.parent;
        }

        if (useContextVariables && currentSelectors.length > 0) {
            const contextualValue = this.lookupContextVariable(name, currentSelectors);
            if (contextualValue !== undefined) {
                return contextualValue;
            }
        }

        return rootValue;
    }

    private lookupContextVariable(name: string, currentSelectors: string[]): string | undefined {
        let bestValue: string | undefined;
        let bestScore = -1;

        for (const contextScope of this.contextVariables) {
            const value = contextScope.variables.get(name);
            if (value === undefined) {
                continue;
            }

            for (const contextSelector of contextScope.contexts) {
                if (!this.contextMatchesSelectors(contextSelector, currentSelectors)) {
                    continue;
                }

                const score = this.contextSpecificity(contextSelector);
                if (score > bestScore) {
                    bestScore = score;
                    bestValue = value;
                }
            }
        }

        return bestValue;
    }

    private contextMatchesSelectors(contextSelector: string, currentSelectors: string[]): boolean {
        return currentSelectors.some(currentSelector => this.selectorContainsContext(currentSelector, contextSelector));
    }

    private selectorContainsContext(currentSelector: string, contextSelector: string): boolean {
        const normalizedCurrent = currentSelector.trim();
        const normalizedContext = contextSelector.trim();
        if (!normalizedCurrent || !normalizedContext) {
            return false;
        }

        const escaped = normalizedContext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matcher = new RegExp(`(^|[\\s>+~,(])${escaped}(?=$|[\\s>+~:.,#\\[(])`);
        return matcher.test(normalizedCurrent);
    }

    private contextSpecificity(selector: string): number {
        const ids = this.collectRegexMatches(selector, /#[\w-]+/g).length;
        const classes = this.collectRegexMatches(selector, /\.[\w-]+|\[[^\]]+\]|:[\w-]+(?:\([^)]*\))?/g).length;
        const elements = this.collectRegexMatches(selector, /(^|[\s>+~,(])([a-z][\w-]*)/gi).length;
        return ids * 100 + classes * 10 + elements;
    }

    private lookupMixin(scope: Scope, name: string): MixinNode | undefined {
        let current: Scope | undefined = scope;
        while (current) {
            const mixin = current.mixins.get(name);
            if (mixin) {
                return mixin;
            }
            current = current.parent;
        }
        return undefined;
    }

    private applyLayers(names: string[], scope: Scope, currentSelectors: string[] = []): void {
        names.forEach((name, index) => {
            this.layerMap.set(this.resolveSelectorText(name, scope, currentSelectors), (index + 1) * 100);
        });
    }

    private resolveLayerValue(value: string): string {
        const key = value.trim();
        if (this.layerMap.has(key)) {
            return String(this.layerMap.get(key));
        }
        return key;
    }

    private extractThemePair(value: string): { light: string; dark: string } | null {
        const parts: Record<string, string> = {};
        let index = 0;

        while (index < value.length) {
            while (index < value.length && /\s/.test(value[index])) {
                index += 1;
            }

            if (index >= value.length) {
                break;
            }

            const match = value.slice(index).match(/^(light|dark)\s*\(/);
            if (!match) {
                return null;
            }

            const name = match[1];
            const openParen = value.indexOf('(', index + name.length);
            const closeParen = this.findMatchingParen(value, openParen);
            if (closeParen === -1) {
                return null;
            }

            parts[name] = value.slice(openParen + 1, closeParen).trim();
            index = closeParen + 1;
        }

        return parts.light && parts.dark
            ? { light: parts.light, dark: parts.dark }
            : null;
    }

    private expandPrefixes(property: string, value: string, source: SourceLocation): CssDeclaration[] {
        const declarations: CssDeclaration[] = [];

        if (property === 'display' && value === 'flex') {
            declarations.push({ property: 'display', value: '-webkit-box', source });
            declarations.push({ property: 'display', value: '-ms-flexbox', source });
        }

        if (property === 'display' && value === 'inline-flex') {
            declarations.push({ property: 'display', value: '-webkit-inline-box', source });
            declarations.push({ property: 'display', value: '-ms-inline-flexbox', source });
        }

        if (property === 'user-select') {
            declarations.push({ property: '-webkit-user-select', value, source });
            declarations.push({ property: '-moz-user-select', value, source });
            declarations.push({ property: '-ms-user-select', value, source });
        }

        if (property === 'appearance') {
            declarations.push({ property: '-webkit-appearance', value, source });
            declarations.push({ property: '-moz-appearance', value, source });
        }

        if (property === 'backdrop-filter') {
            declarations.push({ property: '-webkit-backdrop-filter', value, source });
        }

        if (property === 'filter') {
            declarations.push({ property: '-webkit-filter', value, source });
        }

        if (property === 'backface-visibility') {
            declarations.push({ property: '-webkit-backface-visibility', value, source });
        }

        if (property === 'transform') {
            declarations.push({ property: '-webkit-transform', value, source });
        }

        if (property === 'transform-origin') {
            declarations.push({ property: '-webkit-transform-origin', value, source });
        }

        if (property === 'transform-style') {
            declarations.push({ property: '-webkit-transform-style', value, source });
        }

        if (property === 'perspective') {
            declarations.push({ property: '-webkit-perspective', value, source });
        }

        if (property === 'perspective-origin') {
            declarations.push({ property: '-webkit-perspective-origin', value, source });
        }

        if (property === 'mask' || property.startsWith('mask-')) {
            declarations.push({ property: `-webkit-${property}`, value, source });
        }

        if (property === 'position' && value === 'sticky') {
            declarations.push({ property: 'position', value: '-webkit-sticky', source });
        }

        if (property === 'hyphens') {
            declarations.push({ property: '-webkit-hyphens', value, source });
            declarations.push({ property: '-ms-hyphens', value, source });
        }

        if (property === 'text-size-adjust') {
            declarations.push({ property: '-webkit-text-size-adjust', value, source });
            declarations.push({ property: '-ms-text-size-adjust', value, source });
        }

        if (property === 'background-clip' && value === 'text') {
            declarations.push({ property: '-webkit-background-clip', value, source });
        }

        if (property === 'clip-path') {
            declarations.push({ property: '-webkit-clip-path', value, source });
        }

        if (property === 'gap') {
            declarations.push({ property: 'grid-gap', value, source });
        }

        if (property === 'row-gap') {
            declarations.push({ property: 'grid-row-gap', value, source });
        }

        if (property === 'column-gap') {
            declarations.push({ property: 'grid-column-gap', value, source });
        }

        if (property === 'overflow' && value === 'clip') {
            declarations.push({ property: 'overflow', value: 'hidden', source });
        }

        if (property === 'text-decoration-skip-ink') {
            declarations.push({
                property: '-webkit-text-decoration-skip',
                value: value === 'auto' ? 'ink' : value,
                source
            });
        }

        if (property === 'inline-size') {
            declarations.push({ property: 'width', value, source });
        }

        if (property === 'min-inline-size') {
            declarations.push({ property: 'min-width', value, source });
        }

        if (property === 'max-inline-size') {
            declarations.push({ property: 'max-width', value, source });
        }

        if (property === 'block-size') {
            declarations.push({ property: 'height', value, source });
        }

        if (property === 'min-block-size') {
            declarations.push({ property: 'min-height', value, source });
        }

        if (property === 'max-block-size') {
            declarations.push({ property: 'max-height', value, source });
        }

        if (property === 'place-items') {
            const [align, justify] = this.expandPairValues(value);
            declarations.push({ property: 'align-items', value: align, source });
            declarations.push({ property: 'justify-items', value: justify, source });
        }

        if (property === 'place-content') {
            const [align, justify] = this.expandPairValues(value);
            declarations.push({ property: 'align-content', value: align, source });
            declarations.push({ property: 'justify-content', value: justify, source });
        }

        if (property === 'place-self') {
            const [align, justify] = this.expandPairValues(value);
            declarations.push({ property: 'align-self', value: align, source });
            declarations.push({ property: 'justify-self', value: justify, source });
        }

        if (property === 'margin-inline') {
            const [start, end] = this.expandPairValues(value);
            declarations.push({ property: 'margin-left', value: start, source });
            declarations.push({ property: 'margin-right', value: end, source });
        }

        if (property === 'margin-block') {
            const [start, end] = this.expandPairValues(value);
            declarations.push({ property: 'margin-top', value: start, source });
            declarations.push({ property: 'margin-bottom', value: end, source });
        }

        if (property === 'padding-inline') {
            const [start, end] = this.expandPairValues(value);
            declarations.push({ property: 'padding-left', value: start, source });
            declarations.push({ property: 'padding-right', value: end, source });
        }

        if (property === 'padding-block') {
            const [start, end] = this.expandPairValues(value);
            declarations.push({ property: 'padding-top', value: start, source });
            declarations.push({ property: 'padding-bottom', value: end, source });
        }

        if (property === 'margin-inline-start') {
            declarations.push({ property: 'margin-left', value, source });
        }

        if (property === 'margin-inline-end') {
            declarations.push({ property: 'margin-right', value, source });
        }

        if (property === 'margin-block-start') {
            declarations.push({ property: 'margin-top', value, source });
        }

        if (property === 'margin-block-end') {
            declarations.push({ property: 'margin-bottom', value, source });
        }

        if (property === 'padding-inline-start') {
            declarations.push({ property: 'padding-left', value, source });
        }

        if (property === 'padding-inline-end') {
            declarations.push({ property: 'padding-right', value, source });
        }

        if (property === 'padding-block-start') {
            declarations.push({ property: 'padding-top', value, source });
        }

        if (property === 'padding-block-end') {
            declarations.push({ property: 'padding-bottom', value, source });
        }

        if (property === 'inset') {
            const [top, right, bottom, left] = this.expandBoxValues(value);
            declarations.push({ property: 'top', value: top, source });
            declarations.push({ property: 'right', value: right, source });
            declarations.push({ property: 'bottom', value: bottom, source });
            declarations.push({ property: 'left', value: left, source });
        }

        if (property === 'inset-inline') {
            const [start, end] = this.expandPairValues(value);
            declarations.push({ property: 'left', value: start, source });
            declarations.push({ property: 'right', value: end, source });
        }

        if (property === 'inset-block') {
            const [start, end] = this.expandPairValues(value);
            declarations.push({ property: 'top', value: start, source });
            declarations.push({ property: 'bottom', value: end, source });
        }

        if (property === 'inset-inline-start') {
            declarations.push({ property: 'left', value, source });
        }

        if (property === 'inset-inline-end') {
            declarations.push({ property: 'right', value, source });
        }

        if (property === 'inset-block-start') {
            declarations.push({ property: 'top', value, source });
        }

        if (property === 'inset-block-end') {
            declarations.push({ property: 'bottom', value, source });
        }

        if (
            (property === 'width'
                || property === 'min-width'
                || property === 'max-width'
                || property === 'height'
                || property === 'min-height'
                || property === 'max-height')
            && value === 'fit-content'
        ) {
            declarations.push({ property, value: '-moz-fit-content', source });
            declarations.push({ property, value: '-webkit-fit-content', source });
        }

        declarations.push({ property, value, source });
        return declarations;
    }

    private applyFunction(value: string, functionName: string, handler: (args: string[]) => string): string {
        let output = value;
        let cursor = 0;

        while (cursor < output.length) {
            const index = this.findFunctionIndex(output, functionName, cursor);
            if (index === -1) {
                break;
            }

            const openParen = output.indexOf('(', index + functionName.length);
            const closeParen = this.findMatchingParen(output, openParen);
            if (closeParen === -1) {
                break;
            }

            const args = splitByComma(output.slice(openParen + 1, closeParen));
            const replacement = handler(args);
            output = output.slice(0, index) + replacement + output.slice(closeParen + 1);
            cursor = index + replacement.length;
        }

        return output;
    }

    private findFunctionIndex(value: string, functionName: string, fromIndex: number): number {
        let index = value.indexOf(functionName, fromIndex);

        while (index !== -1) {
            const before = value[index - 1] || '';
            if (!/[\w-]/.test(before) && /^\s*\(/.test(value.slice(index + functionName.length))) {
                return index;
            }
            index = value.indexOf(functionName, index + functionName.length);
        }

        return -1;
    }

    private findMatchingParen(value: string, openParenIndex: number): number {
        let depth = 0;
        let quote = '';

        for (let i = openParenIndex; i < value.length; i += 1) {
            const char = value[i];

            if (quote) {
                if (char === '\\') {
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
                continue;
            }

            if (char === '(') {
                depth += 1;
                continue;
            }

            if (char === ')') {
                depth -= 1;
                if (depth === 0) {
                    return i;
                }
            }
        }

        return -1;
    }

    private containerUnit(rawValue: string | undefined, unit: string, functionName: string): string {
        if (!rawValue) {
            return `100${unit}`;
        }

        const value = rawValue.trim();
        if (!value) {
            return `100${unit}`;
        }

        if (/^-?\d*\.?\d+%$/.test(value)) {
            return `${value.slice(0, -1)}${unit}`;
        }

        if (/^-?\d*\.?\d+$/.test(value)) {
            return `${value}${unit}`;
        }

        const normalized = value.replace(/(-?\d*\.?\d+)%/g, (_match: string, numeric: string) => `${numeric}${unit}`);
        if (normalized === value) {
            return `${functionName}(${value})`;
        }

        if (!/[+\-*/()]/.test(normalized)) {
            return normalized;
        }

        return this.evaluateMath(normalized);
    }

    private splitSpaceList(value: string): string[] {
        const items: string[] = [];
        let quote = '';
        let parenDepth = 0;
        let bracketDepth = 0;
        let current = '';

        for (let index = 0; index < value.length; index += 1) {
            const char = value[index];

            if (quote) {
                current += char;
                if (char === '\\' && index + 1 < value.length) {
                    current += value[index + 1];
                    index += 1;
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

            if (/\s/.test(char) && parenDepth === 0 && bracketDepth === 0) {
                if (current.trim()) {
                    items.push(current.trim());
                    current = '';
                }
                continue;
            }

            current += char;
        }

        if (current.trim()) {
            items.push(current.trim());
        }

        return items;
    }

    private expandPairValues(value: string): [string, string] {
        const parts = this.splitSpaceList(value);
        if (parts.length === 0) {
            return ['', ''];
        }
        if (parts.length === 1) {
            return [parts[0], parts[0]];
        }
        return [parts[0], parts[1]];
    }

    private expandBoxValues(value: string): [string, string, string, string] {
        const parts = this.splitSpaceList(value);
        if (parts.length === 0) {
            return ['', '', '', ''];
        }
        if (parts.length === 1) {
            return [parts[0], parts[0], parts[0], parts[0]];
        }
        if (parts.length === 2) {
            return [parts[0], parts[1], parts[0], parts[1]];
        }
        if (parts.length === 3) {
            return [parts[0], parts[1], parts[2], parts[1]];
        }
        return [parts[0], parts[1], parts[2], parts[3]];
    }

    private adjustColor(color: string | undefined, amount: string | undefined, mode: 'lighten' | 'darken'): string {
        if (!color || !amount) {
            return '';
        }

        const parsed = this.parseColor(color.trim());
        if (!parsed) {
            return `${mode}(${color}, ${amount})`;
        }

        const ratio = Math.max(0, Math.min(1, Number(amount.replace('%', '')) / 100));
        const adjust = (channel: number): number => {
            if (mode === 'lighten') {
                return Math.round(channel + (255 - channel) * ratio);
            }
            return Math.round(channel * (1 - ratio));
        };

        return this.formatColor({
            r: adjust(parsed.r),
            g: adjust(parsed.g),
            b: adjust(parsed.b),
            a: parsed.a
        });
    }

    private applyAlpha(color: string | undefined, alpha: string | undefined): string {
        if (!color || !alpha) {
            return '';
        }

        const parsed = this.parseColor(color.trim());
        if (!parsed) {
            return `alpha(${color}, ${alpha})`;
        }

        return this.formatColor({
            r: parsed.r,
            g: parsed.g,
            b: parsed.b,
            a: Math.max(0, Math.min(1, Number(alpha)))
        });
    }

    private mixColors(left: string | undefined, right: string | undefined, weight?: string): string {
        if (!left || !right) {
            return '';
        }

        const first = this.parseColor(left.trim());
        const second = this.parseColor(right.trim());
        if (!first || !second) {
            return `mix(${left}, ${right}${weight ? `, ${weight}` : ''})`;
        }

        const ratio = weight ? Math.max(0, Math.min(1, Number(weight.replace('%', '')) / 100)) : 0.5;
        const blend = (a: number, b: number): number => Math.round(a * ratio + b * (1 - ratio));
        return this.formatColor({
            r: blend(first.r, second.r),
            g: blend(first.g, second.g),
            b: blend(first.b, second.b),
            a: Number((first.a * ratio + second.a * (1 - ratio)).toFixed(3))
        });
    }

    private parseColor(input: string): { r: number; g: number; b: number; a: number } | null {
        const hex = input.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
        if (hex) {
            const value = hex[1].length === 3
                ? hex[1].split('').map(part => part + part).join('')
                : hex[1];
            return {
                r: parseInt(value.slice(0, 2), 16),
                g: parseInt(value.slice(2, 4), 16),
                b: parseInt(value.slice(4, 6), 16),
                a: 1
            };
        }

        const rgb = input.match(/^rgba?\(([^)]+)\)$/i);
        if (rgb) {
            const values = rgb[1].split(',').map(part => Number(part.trim()));
            if (values.length >= 3) {
                return {
                    r: values[0],
                    g: values[1],
                    b: values[2],
                    a: values[3] ?? 1
                };
            }
        }

        return null;
    }

    private formatColor(color: { r: number; g: number; b: number; a: number }): string {
        const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
        if (color.a !== 1) {
            return `rgba(${clamp(color.r)}, ${clamp(color.g)}, ${clamp(color.b)}, ${Number(color.a.toFixed(3))})`;
        }

        return `#${[color.r, color.g, color.b]
            .map(channel => this.leftPad(clamp(channel).toString(16), 2, '0'))
            .join('')}`;
    }

    private evaluateMath(expression: string | undefined): string {
        if (!expression) {
            return '';
        }

        const tokens = this.collectRegexMatches(expression, /-?\d*\.?\d+[a-z%]*|[()+\-*/]/gi).map(match => match[0]);
        let index = 0;

        const parseFactor = (): { value: number; unit: string } => {
            const token = tokens[index];
            if (!token) {
                return { value: 0, unit: '' };
            }
            if (token === '(') {
                index += 1;
                const value = parseExpression();
                index += 1;
                return value;
            }

            index += 1;
            const match = token.match(/^(-?\d*\.?\d+)([a-z%]*)$/i);
            if (!match) {
                return { value: 0, unit: '' };
            }

            return {
                value: Number(match[1]),
                unit: match[2] || ''
            };
        };

        const combine = (
            left: { value: number; unit: string },
            right: { value: number; unit: string },
            operator: string
        ): { value: number; unit: string } => {
            if (operator === '+' || operator === '-') {
                const unit = left.unit || right.unit;
                if (left.unit && right.unit && left.unit !== right.unit) {
                    return { value: NaN, unit: '' };
                }
                return {
                    value: operator === '+' ? left.value + right.value : left.value - right.value,
                    unit
                };
            }

            if (operator === '*') {
                if (left.unit && right.unit) {
                    return { value: NaN, unit: '' };
                }
                return {
                    value: left.value * right.value,
                    unit: left.unit || right.unit
                };
            }

            if (right.unit) {
                return { value: NaN, unit: '' };
            }

            return {
                value: left.value / right.value,
                unit: left.unit
            };
        };

        const parseTerm = (): { value: number; unit: string } => {
            let value = parseFactor();
            while (tokens[index] === '*' || tokens[index] === '/') {
                const operator = tokens[index];
                index += 1;
                value = combine(value, parseFactor(), operator);
            }
            return value;
        };

        const parseExpression = (): { value: number; unit: string } => {
            let value = parseTerm();
            while (tokens[index] === '+' || tokens[index] === '-') {
                const operator = tokens[index];
                index += 1;
                value = combine(value, parseTerm(), operator);
            }
            return value;
        };

        const result = parseExpression();
        if (Number.isNaN(result.value)) {
            return `calc(${expression.trim()})`;
        }

        const normalizedValue = Number.isInteger(result.value)
            ? String(result.value)
            : String(Number(result.value.toFixed(4)));
        return `${normalizedValue}${result.unit}`;
    }

    private evaluateCondition(condition: string, scope: Scope, currentSelectors: string[] = []): boolean {
        const resolved = this.resolveValue(condition, scope, currentSelectors);
        const match = resolved.match(/^(.*?)\s*(==|!=|>=|<=|>|<)\s*(.*?)$/);
        if (!match) {
            return !['', 'false', '0', 'null', 'undefined'].includes(resolved.trim());
        }

        const left = this.stripQuotes(match[1].trim());
        const right = this.stripQuotes(match[3].trim());
        const numericLeft = Number(left);
        const numericRight = Number(right);
        const comparableLeft = Number.isNaN(numericLeft) ? left : numericLeft;
        const comparableRight = Number.isNaN(numericRight) ? right : numericRight;

        switch (match[2]) {
            case '==':
                return comparableLeft === comparableRight;
            case '!=':
                return comparableLeft !== comparableRight;
            case '>':
                return comparableLeft > comparableRight;
            case '<':
                return comparableLeft < comparableRight;
            case '>=':
                return comparableLeft >= comparableRight;
            case '<=':
                return comparableLeft <= comparableRight;
            default:
                return false;
        }
    }

    private createScope(parent?: Scope): Scope {
        return {
            variables: new Map<string, string>(),
            mixins: new Map<string, MixinNode>(),
            parent
        };
    }

    private createDefaultLayerMap(): Map<string, number> {
        return new Map<string, number>([
            ['base', 0],
            ['header', 100],
            ['sticky', 200],
            ['dropdown', 1000],
            ['overlay', 2000],
            ['modal', 3000],
            ['toast', 4000],
            ['tooltip', 5000]
        ]);
    }

    private createLockKey(selector: string, atRules: string[], property: string): string {
        return `${selector}::${atRules.join('|')}::${property}`;
    }

    private collapseDeclarations(declarations: CssDeclaration[]): CssDeclaration[] {
        const output: CssDeclaration[] = [];
        const seen = new Set<string>();

        for (let index = declarations.length - 1; index >= 0; index -= 1) {
            const declaration = declarations[index];
            const key = `${declaration.property}:${declaration.value}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            output.unshift(declaration);
        }

        return output;
    }

    private declarationSignature(declaration: CssDeclaration): string {
        return `${declaration.property}:${declaration.value}`;
    }

    private utilityVariableName(utilityId: number, property: string, index: number): string {
        const normalizedProperty = property.replace(/[^a-zA-Z0-9-]/g, '-');
        return `--x2s-u-${utilityId}-${normalizedProperty}-${index}`;
    }

    private unique<T>(values: T[]): T[] {
        return Array.from(new Set(values));
    }

    private collectRegexMatches(input: string, expression: RegExp): RegExpExecArray[] {
        const flags = expression.flags.indexOf('g') === -1 ? `${expression.flags}g` : expression.flags;
        const matcher = new RegExp(expression.source, flags);
        const matches: RegExpExecArray[] = [];
        let match = matcher.exec(input);
        while (match) {
            matches.push(match);
            match = matcher.exec(input);
        }
        return matches;
    }

    private sameAtRules(left: string[], right: string[]): boolean {
        return left.length === right.length && left.every((value, index) => value === right[index]);
    }

    private leftPad(value: string, length: number, padCharacter: string): string {
        let output = value;
        while (output.length < length) {
            output = `${padCharacter}${output}`;
        }
        return output;
    }

    private stripQuotes(value: string): string {
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
            return value.slice(1, -1);
        }
        return value;
    }

    private formatLocation(location: SourceLocation): string {
        return `${location.file}:${location.line}:${location.column}`;
    }
}

export { Compiler };

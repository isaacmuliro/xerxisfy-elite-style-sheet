interface BuiltinModule {
    id: string;
    aliases: string[];
    source: string;
}
export declare function resolveBuiltinModule(importPath: string): BuiltinModule | undefined;
export declare function isBuiltinModuleImport(importPath: string): boolean;
export {};

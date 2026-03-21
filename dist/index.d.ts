#!/usr/bin/env node
import { Compiler } from './compiler';
import { CompileOptions, CompileResult } from './types';
declare function compileEntry(entryPath: string, options?: CompileOptions): CompileResult;
declare function compileString(source: string, filePath?: string, options?: CompileOptions): CompileResult;
export { Compiler, compileEntry, compileString };

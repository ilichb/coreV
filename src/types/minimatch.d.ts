declare module 'minimatch' {
    export interface IMinimatch {
        match(path: string): boolean;
    }
    export function match(list: string[], pattern: string, options?: any): string[];
    export function filter(pattern: string, options?: any): (path: string) => boolean;
    export function makeRe(pattern: string, options?: any): RegExp;
    export class Minimatch {
        constructor(pattern: string, options?: any);
        set: any[];
        regexp: RegExp | false;
        match(f: string): boolean;
        makeRe(): RegExp | false;
    }
}

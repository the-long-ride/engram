declare const process: {
  argv: string[];
  cwd(): string;
  exit(code?: number): never;
  env: Record<string, string | undefined>;
  stdin: any;
  stdout: any;
  stderr: any;
};
declare const console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
};
declare const Buffer: any;
declare module 'node:fs/promises' { const mod: any; export = mod; }
declare module 'node:fs' { export const existsSync: any; export const mkdirSync: any; }
declare module 'node:path' { const mod: any; export = mod; }
declare module 'node:os' { export const homedir: any; export const EOL: string; }
declare module 'node:crypto' {
  export const createHash: any;
  export const createCipheriv: any;
  export const createDecipheriv: any;
  export const randomBytes: any;
}
declare module 'node:child_process' { export const execFile: any; }
declare module 'node:readline/promises' { export const createInterface: any; }
declare module 'node:readline' { export const createInterface: any; }
declare module 'node:process' { export const stdin: any; export const stdout: any; }

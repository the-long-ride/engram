/** Resolve and launch the user's editor without shell interpolation. */
import { spawn } from 'node:child_process';

export type EditorResolveOptions = {
  platform?: 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32';
  env?: Record<string, string | undefined>;
  web?: boolean;
};

export type EditorLaunchOptions = {
  wait?: boolean;
  stdio?: 'inherit' | 'ignore';
};

export function splitEditorCommand(command: string): string[] {
  const parts: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
  for (const match of command.matchAll(pattern)) parts.push(match[1] ?? match[2] ?? match[3]);
  return parts.filter(Boolean);
}

export function resolveEditorCommand(options: EditorResolveOptions = {}): string[] {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const web = options.web === true;
  const configured = env.VISUAL?.trim() || env.EDITOR?.trim();
  if (configured) {
    const parsed = splitEditorCommand(configured);
    if (parsed.length) return parsed;
  }
  if (platform === 'win32') return ['notepad.exe'];
  if (platform === 'darwin') return web ? ['open', '-t'] : ['open', '-W', '-t'];
  return web ? ['xdg-open'] : ['vi'];
}

export async function launchEditor(command: string[], file: string, options: EditorLaunchOptions = {}): Promise<void> {
  const [program, ...args] = command;
  if (!program) throw new Error('No editor command is available. Set $VISUAL or $EDITOR.');
  const wait = options.wait !== false;
  const stdio = options.stdio ?? (wait ? 'inherit' : 'ignore');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(program, [...args, file], { stdio, shell: false });
    child.once('error', reject);
    if (wait) {
      child.once('exit', (code: number | null) => code === 0 ? resolve() : reject(new Error(`Editor exited with code ${code ?? 'unknown'}`)));
      return;
    }
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

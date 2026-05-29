/** Optional bridge to @the-long-ride/markdown-them for document-to-Markdown conversion. */
import path from 'node:path';

export const MARKDOWN_THEM_PACKAGE = '@the-long-ride/markdown-them';

type MarkdownThemModule = Record<string, any>;
type MarkdownThemLoader = () => Promise<MarkdownThemModule | undefined>;
let loadedModule: MarkdownThemModule | undefined;
let loadAttempted = false;

const documentExtensions = new Set([
  '.adoc', '.doc', '.docx', '.epub', '.htm', '.html', '.odt', '.pdf', '.ppt',
  '.pptx', '.rtf', '.xls', '.xlsx'
]);

/** Return true when a file should be converted through markdown-them before import. */
export function isConvertibleDocument(file: string): boolean {
  return documentExtensions.has(path.extname(file).toLowerCase());
}

/** Convert a document file to Markdown using markdown-them when available. */
export async function convertDocumentToMarkdown(file: string, loader: MarkdownThemLoader = loadMarkdownThem): Promise<string> {
  const mod = await loader();
  if (!mod) throw new Error(`${MARKDOWN_THEM_PACKAGE} is required to convert document files before Engram import`);
  const fn = converterFunction(mod);
  if (!fn) throw new Error(`${MARKDOWN_THEM_PACKAGE} must export a document-to-Markdown function`);
  return normalizeMarkdown(await callConverter(fn, file));
}

async function loadMarkdownThem(): Promise<MarkdownThemModule | undefined> {
  if (loadAttempted) return loadedModule;
  loadAttempted = true;
  try {
    const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<MarkdownThemModule>;
    loadedModule = await dynamicImport(MARKDOWN_THEM_PACKAGE);
    return loadedModule;
  } catch (error: any) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'MODULE_NOT_FOUND') return undefined;
    throw error;
  }
}

function converterFunction(mod: MarkdownThemModule): ((input: any) => unknown) | undefined {
  for (const name of ['markdownThem', 'toMarkdown', 'convertToMarkdown', 'documentToMarkdown', 'convertDocument', 'convertFile', 'convert']) {
    if (typeof mod[name] === 'function') return mod[name].bind(mod);
  }
  return typeof mod.default === 'function' ? mod.default.bind(mod) : undefined;
}

async function callConverter(fn: (input: any) => unknown, file: string): Promise<unknown> {
  const attempts = [
    () => fn(file),
    () => fn({ file }),
    () => fn({ path: file }),
    () => fn({ input: file, file, path: file })
  ];
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result !== undefined && result !== null) return result;
    } catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new Error('markdown-them conversion failed');
}

function normalizeMarkdown(result: unknown): string {
  if (typeof result === 'string') return result;
  const directBuffer = bufferText(result);
  if (directBuffer) return directBuffer;
  if (result && typeof result === 'object') {
    const value = result as Record<string, unknown>;
    for (const key of ['markdown', 'content', 'text', 'output']) {
      if (typeof value[key] === 'string') return value[key] as string;
      const item = value[key];
      const nestedBuffer = bufferText(item);
      if (nestedBuffer) return nestedBuffer;
    }
  }
  throw new Error('markdown-them did not return Markdown text');
}

function bufferText(value: unknown): string | undefined {
  return Buffer.isBuffer(value as any) ? (value as any).toString('utf8') : undefined;
}

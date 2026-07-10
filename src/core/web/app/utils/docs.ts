const DOCS_BASE_URL = 'https://the-long-ride.github.io/engram/docs';

function docSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function entryDoc(path: string, anchor?: string): string {
  return `${DOCS_BASE_URL}/entry/${path}${anchor ? `#${anchor}` : ''}`;
}

export function entryFieldGroupDoc(group: string): string {
  return entryDoc('field-reference', docSlug(group));
}

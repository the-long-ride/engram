/** Validate and normalize author names, emails, and complete profiles. */
import type { AuthorProfile } from './types.js';

const CONTROL = /[\u0000-\u001f\u007f]/u;

export function normalizeAuthorName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || CONTROL.test(name) || [...name].length > 200) {
    throw new Error('Invalid author name: use 1-200 Unicode characters without control characters');
  }
  return name;
}

export function normalizeAuthorEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim() : '';
  const at = email.indexOf('@');
  const exactlyOneAt = at > 0 && at === email.lastIndexOf('@') && at < email.length - 1;
  if (!exactlyOneAt || email.length > 320 || /[\s\u0000-\u001f\u007f<>]/u.test(email)) {
    throw new Error('Invalid author email: use local@domain without whitespace, controls, or angle brackets');
  }
  return email;
}

export function normalizeAuthorProfile(value: unknown): AuthorProfile {
  const input = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    name: normalizeAuthorName(input.name),
    email: normalizeAuthorEmail(input.email)
  };
}

export function tryNormalizeAuthorProfile(value: unknown): AuthorProfile | null {
  try { return normalizeAuthorProfile(value); }
  catch { return null; }
}

// Config value conversion and validation helpers for the web UI.
import type { ConfigField } from '../types.js';

export function gv(obj: any, key: string): any {
  return key.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
}

export function uiValue(field: ConfigField, value: unknown): string {
  if (field.input === 'roles') return Array.isArray(value) ? value.join(', ') : String(value || '');
  if (field.input === 'toggle') return String(value === true || value === 'true');
  return value == null ? '' : String(value);
}

export function parseFieldValue(field: ConfigField, value: string): unknown {
  if (field.input === 'toggle') return value === 'true';
  if (field.input === 'number') return Number(value);
  if (field.input === 'roles') return value.trim() ? value.split(',').map((role) => role.trim()).filter(Boolean) : [];
  return value;
}

export function clientValidationError(field: ConfigField, value: string): string {
  if (field.input === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) return field.label + ' must be a number';
    if ((field.step || 1) >= 1 && Math.floor(n) !== n) return field.label + ' must be an integer';
    if (field.min != null && n < field.min) return field.label + ' must be at least ' + field.min;
    if (field.max != null && n > field.max) return field.label + ' must be at most ' + field.max;
  }
  if (field.input === 'roles') {
    const raw = String(value || '').trim();
    if (raw) {
      const roles = raw.split(',').map((role) => role.trim());
      if (roles.some((role) => !role)) return 'roles cannot contain empty role names';
      const bad = roles.find((role) => !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(role));
      if (bad) return 'Invalid role: ' + bad;
    }
  }
  if ((field.key === 'global_git.remote' || field.key.includes('.branch')) && /\s/.test(String(value || ''))) return field.label + ' cannot contain whitespace';
  return '';
}

export function groupFields(fields: ConfigField[]): Record<string, ConfigField[]> {
  return fields.reduce<Record<string, ConfigField[]>>((groups, field) => {
    (groups[field.group] ||= []).push(field);
    return groups;
  }, {});
}

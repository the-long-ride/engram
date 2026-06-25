import { fmtDate, relTime } from '../../src/core/web/app/utils/format.js';
import { gv, uiValue, parseFieldValue, clientValidationError, groupFields } from '../../src/core/web/app/utils/config.js';
import { copyText } from '../../src/core/web/app/utils/clipboard.js';
import { safeText } from '../../src/core/web/app/utils/html.js';
import type { ConfigField } from '../../src/core/web/app/types.js';

describe('format utils', () => {
  test('fmtDate formats date values correctly', () => {
    expect(fmtDate(null)).toBe('-');
    expect(fmtDate(undefined)).toBe('-');
    const isoString = '2026-06-25T15:00:00Z';
    const expectedRegex = /2026|06|25/;
    expect(fmtDate(isoString)).toMatch(expectedRegex);
    expect(fmtDate('invalid-date')).toContain('Invalid Date');
  });

  test('relTime computes relative time correctly', () => {
    expect(relTime(null)).toBe('-');
    expect(relTime(undefined)).toBe('-');

    const now = Date.now();
    expect(relTime(new Date(now - 10000).toISOString())).toBe('just now');
    expect(relTime(new Date(now - 120000).toISOString())).toBe('2m ago');
    expect(relTime(new Date(now - 7200000).toISOString())).toBe('2h ago');
    expect(relTime(new Date(now - 172800000).toISOString())).toBe('2d ago');
    expect(relTime('invalid-date')).toBe('invalid-date');
  });
});

describe('config utils', () => {
  test('gv fetches nested values correctly', () => {
    const obj = { a: { b: { c: 42 } } };
    expect(gv(obj, 'a.b.c')).toBe(42);
    expect(gv(obj, 'a.x')).toBeUndefined();
    expect(gv(null, 'a')).toBeNull();
  });

  test('uiValue outputs correct values', () => {
    const rolesField: ConfigField = { key: 'load.roles', group: 'Load', label: 'Roles', input: 'roles' };
    const toggleField: ConfigField = { key: 'load.enabled', group: 'Load', label: 'Enabled', input: 'toggle' };
    const textField: ConfigField = { key: 'load.path', group: 'Load', label: 'Path', input: 'text' };

    expect(uiValue(rolesField, ['admin', 'user'])).toBe('admin, user');
    expect(uiValue(rolesField, null)).toBe('');
    expect(uiValue(toggleField, true)).toBe('true');
    expect(uiValue(toggleField, 'false')).toBe('false');
    expect(uiValue(textField, 'some-path')).toBe('some-path');
    expect(uiValue(textField, null)).toBe('');
  });

  test('parseFieldValue parses fields correctly', () => {
    const rolesField: ConfigField = { key: 'load.roles', group: 'Load', label: 'Roles', input: 'roles' };
    const toggleField: ConfigField = { key: 'load.enabled', group: 'Load', label: 'Enabled', input: 'toggle' };
    const numberField: ConfigField = { key: 'load.limit', group: 'Load', label: 'Limit', input: 'number' };
    const textField: ConfigField = { key: 'load.path', group: 'Load', label: 'Path', input: 'text' };

    expect(parseFieldValue(toggleField, 'true')).toBe(true);
    expect(parseFieldValue(toggleField, 'false')).toBe(false);
    expect(parseFieldValue(numberField, '42')).toBe(42);
    expect(parseFieldValue(rolesField, 'admin, user')).toEqual(['admin', 'user']);
    expect(parseFieldValue(rolesField, ' ')).toEqual([]);
    expect(parseFieldValue(textField, 'value')).toBe('value');
  });

  test('clientValidationError validates inputs correctly', () => {
    const numberField: ConfigField = { key: 'load.limit', group: 'Load', label: 'Limit', input: 'number', min: 1, max: 100, step: 1 };
    const floatField: ConfigField = { key: 'load.score', group: 'Load', label: 'Score', input: 'number', min: 0.1, step: 0.1 };
    const rolesField: ConfigField = { key: 'load.roles', group: 'Load', label: 'Roles', input: 'roles' };
    const gitBranchField: ConfigField = { key: 'global_git.branch', group: 'Git', label: 'Branch', input: 'text' };

    expect(clientValidationError(numberField, 'not-a-number')).toBe('Limit must be a number');
    expect(clientValidationError(numberField, '1.5')).toBe('Limit must be an integer');
    expect(clientValidationError(numberField, '0')).toBe('Limit must be at least 1');
    expect(clientValidationError(numberField, '101')).toBe('Limit must be at most 100');
    expect(clientValidationError(numberField, '50')).toBe('');

    expect(clientValidationError(floatField, '0.5')).toBe('');

    expect(clientValidationError(rolesField, 'admin,,user')).toBe('roles cannot contain empty role names');
    expect(clientValidationError(rolesField, 'bad@role')).toBe('Invalid role: bad@role');
    expect(clientValidationError(rolesField, 'admin, user-role')).toBe('');

    expect(clientValidationError(gitBranchField, 'main branch')).toBe('Branch cannot contain whitespace');
    expect(clientValidationError(gitBranchField, 'main')).toBe('');
  });

  test('groupFields groups fields correctly by group name', () => {
    const fields: ConfigField[] = [
      { key: 'a', group: 'G1', label: 'A', input: 'text' },
      { key: 'b', group: 'G2', label: 'B', input: 'text' },
      { key: 'c', group: 'G1', label: 'C', input: 'text' },
    ];
    const grouped = groupFields(fields);
    expect(grouped['G1']).toHaveLength(2);
    expect(grouped['G2']).toHaveLength(1);
    expect(grouped['G1'][0].key).toBe('a');
    expect(grouped['G1'][1].key).toBe('c');
  });
});

describe('clipboard utils', () => {
  test('copyText copies and toasts success/failure', async () => {
    const toast = jest.fn();
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    await copyText('hello', toast);
    expect(writeTextMock).toHaveBeenCalledWith('hello');
    expect(toast).toHaveBeenCalledWith('Copied');

    writeTextMock.mockRejectedValueOnce(new Error('fail'));
    await copyText('hello', toast);
    expect(toast).toHaveBeenCalledWith('Copy failed', false);
  });
});

describe('html utils', () => {
  test('safeText returns string or empty string', () => {
    expect(safeText(null)).toBe('');
    expect(safeText(undefined)).toBe('');
    expect(safeText(42)).toBe('42');
    expect(safeText('hello')).toBe('hello');
  });
});

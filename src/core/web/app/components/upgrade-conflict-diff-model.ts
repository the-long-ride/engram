// Build deterministic line-diff operations and aligned rows for upgrade conflict review.
export type UpgradeDiffKind = 'unchanged' | 'removed' | 'added';
export type UpgradeDiffOp = { text: string; kind: UpgradeDiffKind };
export type UpgradeDiffCurrentCell = { text: string; kind: 'unchanged' | 'removed' };
export type UpgradeDiffProposedCell = { text: string; kind: 'unchanged' | 'added' };
export type UpgradeDiffRow = {
  current?: UpgradeDiffCurrentCell;
  proposed?: UpgradeDiffProposedCell;
};
export type UpgradeConflictDiffModel = {
  changed: boolean;
  ops: UpgradeDiffOp[];
  rows: UpgradeDiffRow[];
};

function splitLines(value: string): string[] {
  const normalized = value.replace(/\r\n/g, '\n');
  return normalized === '' ? [] : normalized.split('\n');
}

function buildOps(current: string, proposed: string): UpgradeDiffOp[] {
  const left = splitLines(current);
  const right = splitLines(proposed);
  const lcs = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1));

  for (let row = left.length - 1; row >= 0; row -= 1) {
    for (let col = right.length - 1; col >= 0; col -= 1) {
      lcs[row][col] = left[row] === right[col]
        ? lcs[row + 1][col + 1] + 1
        : Math.max(lcs[row + 1][col], lcs[row][col + 1]);
    }
  }

  const ops: UpgradeDiffOp[] = [];
  let row = 0;
  let col = 0;
  while (row < left.length || col < right.length) {
    if (row < left.length && col < right.length && left[row] === right[col]) {
      ops.push({ text: left[row], kind: 'unchanged' });
      row += 1;
      col += 1;
      continue;
    }
    if (row < left.length && (col >= right.length || lcs[row + 1][col] >= lcs[row][col + 1])) {
      ops.push({ text: left[row], kind: 'removed' });
      row += 1;
      continue;
    }
    ops.push({ text: right[col], kind: 'added' });
    col += 1;
  }
  return ops;
}

function buildRows(ops: UpgradeDiffOp[]): UpgradeDiffRow[] {
  const rows: UpgradeDiffRow[] = [];
  let index = 0;
  while (index < ops.length) {
    const op = ops[index];
    if (op.kind === 'unchanged') {
      rows.push({
        current: { text: op.text, kind: 'unchanged' },
        proposed: { text: op.text, kind: 'unchanged' }
      });
      index += 1;
      continue;
    }

    const removed: string[] = [];
    const added: string[] = [];
    while (index < ops.length && ops[index].kind !== 'unchanged') {
      const change = ops[index];
      if (change.kind === 'removed') removed.push(change.text);
      else added.push(change.text);
      index += 1;
    }
    const count = Math.max(removed.length, added.length);
    for (let offset = 0; offset < count; offset += 1) {
      const current = offset < removed.length ? { text: removed[offset], kind: 'removed' as const } : undefined;
      const proposed = offset < added.length ? { text: added[offset], kind: 'added' as const } : undefined;
      rows.push({ ...(current ? { current } : {}), ...(proposed ? { proposed } : {}) });
    }
  }
  return rows;
}

export function buildUpgradeConflictDiff(current: string, proposed: string): UpgradeConflictDiffModel {
  const normalizedCurrent = current.replace(/\r\n/g, '\n');
  const normalizedProposed = proposed.replace(/\r\n/g, '\n');
  const ops = buildOps(current, proposed);
  return {
    changed: normalizedCurrent !== normalizedProposed,
    ops,
    rows: buildRows(ops)
  };
}

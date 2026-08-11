/** Deterministically balance test files across CI shards by file-size weight. */
function parseShard(shard) {
  const match = /^(\d+)\/(\d+)$/.exec(shard ?? '');
  const index = Number(match?.[1]);
  const total = Number(match?.[2]);
  if (!match || index < 1 || total < 1 || index > total) {
    throw new Error(`Invalid TEST_SHARD "${shard}"; expected N/M with 1 <= N <= M`);
  }
  return { index, total };
}

export function selectWeightedShard(entries, shard) {
  const { index, total } = parseShard(shard);
  const buckets = Array.from({ length: total }, () => ({ size: 0, files: [] }));
  const sorted = [...entries].sort((a, b) => b.size - a.size || a.file.localeCompare(b.file));

  for (const entry of sorted) {
    let target = 0;
    for (let i = 1; i < buckets.length; i += 1) {
      if (buckets[i].size < buckets[target].size) target = i;
    }
    buckets[target].files.push(entry.file);
    buckets[target].size += entry.size;
  }

  return buckets[index - 1].files.sort();
}

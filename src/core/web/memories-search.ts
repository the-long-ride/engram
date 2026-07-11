// Filter the Memories graph by full-text matches and connected relationships.
export type MemoriesSearchMode = 'direct' | 'related';

type SearchNode = {
  id: string;
  memoryId?: string;
  file?: string;
  summary?: string;
  content?: string;
};

type SearchLink = {
  from: string;
  to: string;
};

export function filterMemoryGraph<TNode extends SearchNode, TLink extends SearchLink>(
  nodes: TNode[],
  links: TLink[],
  query: string,
  mode: MemoriesSearchMode = 'direct'
): { nodes: TNode[]; links: TLink[] } {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return { nodes, links };

  const directIds = new Set(
    nodes
      .filter((node) => [node.memoryId, node.file, node.summary, node.content].some((value) =>
        value?.toLocaleLowerCase().includes(normalizedQuery)
      ))
      .map((node) => node.id)
  );

  if (mode === 'related' && directIds.size) {
    const visibleIds = new Set(directIds);
    let changed = true;
    while (changed) {
      changed = false;
      for (const link of links) {
        if (visibleIds.has(link.from) && !visibleIds.has(link.to)) {
          visibleIds.add(link.to);
          changed = true;
        } else if (visibleIds.has(link.to) && !visibleIds.has(link.from)) {
          visibleIds.add(link.from);
          changed = true;
        }
      }
    }
    return {
      nodes: nodes.filter((node) => visibleIds.has(node.id)),
      links: links.filter((link) => visibleIds.has(link.from) && visibleIds.has(link.to))
    };
  }

  return {
    nodes: nodes.filter((node) => directIds.has(node.id)),
    links: links.filter((link) => directIds.has(link.from) && directIds.has(link.to))
  };
}

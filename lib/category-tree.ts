import type { Category } from "@/lib/types";

export type CategoryNode = Category & { children: CategoryNode[] };

export function getCategoryParentId(cat: Category): string | null {
  return cat.parentId ?? cat.parent_id ?? null;
}

/** Build a tree from a flat category list */
export function buildCategoryTree(flat: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  for (const c of flat) {
    map.set(c.id, { ...c, children: [] });
  }
  const roots: CategoryNode[] = [];
  for (const c of flat) {
    const node = map.get(c.id)!;
    const parentId = getCategoryParentId(c);
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const n of nodes) sortNodes(n.children);
  };
  sortNodes(roots);
  return roots;
}

/** Flatten tree with depth for indented UI */
export function flattenCategoryTree(
  nodes: CategoryNode[],
  depth = 0,
  expanded?: Set<string>,
): Array<CategoryNode & { depth: number }> {
  const out: Array<CategoryNode & { depth: number }> = [];
  for (const node of nodes) {
    out.push({ ...node, depth });
    const showChildren = !expanded || expanded.has(node.id);
    if (showChildren && node.children.length > 0) {
      out.push(...flattenCategoryTree(node.children, depth + 1, expanded));
    }
  }
  return out;
}

/** All descendant ids for a root (includes root id) */
export function collectDescendantIds(rootId: string, flat: Category[]): Set<string> {
  const result = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of flat) {
      const parentId = getCategoryParentId(c);
      if (parentId && result.has(parentId) && !result.has(c.id)) {
        result.add(c.id);
        changed = true;
      }
    }
  }
  return result;
}

export function slugifyCategoryName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "");
  return base || "cat";
}

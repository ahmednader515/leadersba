"use client";

import { useMemo } from "react";
import { useLocale, useT } from "@/components/LocaleProvider";
import { buildCategoryTree, flattenCategoryTree, type CategoryNode } from "@/lib/category-tree";
import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function CategoryTreePicker({ categories, selectedIds, onChange, disabled }: Props) {
  const locale = useLocale();
  const t = useT();
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flat = useMemo(() => flattenCategoryTree(tree), [tree]);

  function label(cat: CategoryNode) {
    const ar = cat.name_ar?.trim();
    const en = cat.name?.trim();
    return locale === "en" ? en || ar || cat.slug : ar || en || cat.slug;
  }

  function toggle(id: string) {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  if (flat.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        {t("dashboard.categoriesManage.emptyList", "No categories yet.")}
      </p>
    );
  }

  return (
    <ul className="max-h-56 space-y-1 overflow-y-auto rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-2">
      {flat.map((cat) => (
        <li key={cat.id} style={{ paddingInlineStart: `${cat.depth * 1.25}rem` }}>
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--color-border)]/30">
            <input
              type="checkbox"
              checked={selectedIds.includes(cat.id)}
              onChange={() => toggle(cat.id)}
              disabled={disabled}
              className="rounded border-[var(--color-border)]"
            />
            <span className="text-[var(--color-foreground)]">{label(cat)}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

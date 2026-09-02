"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "@/components/LocaleProvider";
import {
  buildCategoryTree,
  flattenCategoryTree,
  slugifyCategoryName,
  type CategoryNode,
} from "@/lib/category-tree";
import type { Category } from "@/lib/types";

type CategoryRow = Category & {
  childCount?: number;
  courseCount?: number;
};

export function CategoriesManage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useT();
  const Cm = "dashboard.categoriesManage";

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addParentId, setAddParentId] = useState<string>("");

  const [form, setForm] = useState({
    nameAr: "",
    nameEn: "",
    slug: "",
    order: "0",
    parentId: "",
  });

  const [editForm, setEditForm] = useState({
    nameAr: "",
    nameEn: "",
    slug: "",
    order: "0",
    parentId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error(t(`${Cm}.loadFailed`));
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(`${Cm}.genericError`));
    } finally {
      setLoading(false);
    }
  }, [t, Cm]);

  useEffect(() => {
    load();
  }, [load]);

  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flat = useMemo(() => flattenCategoryTree(tree), [tree]);

  function catLabel(cat: Category) {
    const ar = (cat.name_ar ?? (cat as { nameAr?: string }).nameAr)?.trim();
    const en = cat.name?.trim();
    return locale === "en" ? en || ar || cat.slug : ar || en || cat.slug;
  }

  function parentOptions(excludeId?: string) {
    return flat.filter((c) => c.id !== excludeId);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nameAr.trim() && !form.nameEn.trim()) {
      setError(t(`${Cm}.validationName`));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const slug =
        form.slug.trim() ||
        slugifyCategoryName(form.nameEn.trim() || form.nameAr.trim() || "cat");
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameAr: form.nameAr.trim(),
          nameEn: form.nameEn.trim(),
          slug,
          order: parseInt(form.order, 10) || 0,
          parentId: form.parentId || addParentId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t(`${Cm}.createFailed`));
      setForm({ nameAr: "", nameEn: "", slug: "", order: "0", parentId: "" });
      setAddParentId("");
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(`${Cm}.createFailed`));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(cat: CategoryNode) {
    setEditingId(cat.id);
    setEditForm({
      nameAr: (cat.name_ar ?? (cat as { nameAr?: string }).nameAr) || "",
      nameEn: cat.name || "",
      slug: cat.slug,
      order: String(cat.order ?? 0),
      parentId: cat.parent_id ?? cat.parentId ?? "",
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameAr: editForm.nameAr.trim(),
          nameEn: editForm.nameEn.trim(),
          slug: editForm.slug.trim(),
          order: parseInt(editForm.order, 10) || 0,
          parentId: editForm.parentId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t(`${Cm}.updateFailed`));
      setEditingId(null);
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(`${Cm}.updateFailed`));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t(`${Cm}.deleteFailed`));
      setConfirmDelete(null);
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(`${Cm}.deleteFailed`));
    } finally {
      setDeletingId(null);
    }
  }

  function startAddSub(parentId: string) {
    setAddParentId(parentId);
    setForm((f) => ({ ...f, parentId }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return <p className="mt-6 text-[var(--color-muted)]">{t(`${Cm}.loading`)}</p>;
  }

  return (
    <div className="mt-6 space-y-8">
      {error && (
        <p className="rounded-[var(--radius-btn)] border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <form
        onSubmit={handleCreate}
        className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <h3 className="font-semibold text-[var(--color-foreground)]">
          {addParentId
            ? t(`${Cm}.addSubCategory`, "Add sub-category")
            : t(`${Cm}.addCategory`, "Add category")}
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">{t(`${Cm}.nameArLabel`)}</label>
            <input
              value={form.nameAr}
              onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t(`${Cm}.nameEnLabel`)}</label>
            <input
              value={form.nameEn}
              onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t(`${Cm}.slugLabel`)}</label>
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder={slugifyCategoryName(form.nameEn || form.nameAr || "cat")}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">{t(`${Cm}.slugHint`)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">{t(`${Cm}.parentLabel`)}</label>
            <select
              value={form.parentId || addParentId}
              onChange={(e) => {
                setForm((f) => ({ ...f, parentId: e.target.value }));
                setAddParentId(e.target.value);
              }}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            >
              <option value="">{t(`${Cm}.noParent`)}</option>
              {parentOptions().map((c) => (
                <option key={c.id} value={c.id}>
                  {"—".repeat(c.depth) + (c.depth > 0 ? " " : "") + catLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">{t(`${Cm}.orderLabel`)}</label>
            <input
              type="number"
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? t(`${Cm}.saving`) : t(`${Cm}.saveNew`)}
        </button>
      </form>

      <div>
        <h3 className="font-semibold text-[var(--color-foreground)]">{t(`${Cm}.listTitle`)}</h3>
        <p className="mt-1 text-xs text-[var(--color-muted)]">{t(`${Cm}.deleteWarning`)}</p>
        {flat.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-muted)]">{t(`${Cm}.emptyList`)}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {flat.map((cat) => (
              <li
                key={cat.id}
                className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                style={{ marginInlineStart: `${cat.depth * 1.25}rem` }}
              >
                {editingId === cat.id ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={editForm.nameAr}
                      onChange={(e) => setEditForm((f) => ({ ...f, nameAr: e.target.value }))}
                      placeholder={t(`${Cm}.nameArLabel`)}
                      className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                    />
                    <input
                      value={editForm.nameEn}
                      onChange={(e) => setEditForm((f) => ({ ...f, nameEn: e.target.value }))}
                      placeholder={t(`${Cm}.nameEnLabel`)}
                      className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                    />
                    <input
                      value={editForm.slug}
                      onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                      className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                    />
                    <select
                      value={editForm.parentId}
                      onChange={(e) => setEditForm((f) => ({ ...f, parentId: e.target.value }))}
                      className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                    >
                      <option value="">{t(`${Cm}.noParent`)}</option>
                      {parentOptions(cat.id).map((c) => (
                        <option key={c.id} value={c.id}>
                          {"—".repeat(c.depth) + (c.depth > 0 ? " " : "") + catLabel(c)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={editForm.order}
                      onChange={(e) => setEditForm((f) => ({ ...f, order: e.target.value }))}
                      className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                    />
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(cat.id)}
                        disabled={saving}
                        className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
                      >
                        {saving ? t(`${Cm}.saving`) : t(`${Cm}.saveEdit`)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 text-sm"
                      >
                        {t(`${Cm}.cancelEdit`)}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-[var(--color-foreground)]">{catLabel(cat)}</span>
                      <span className="ms-2 text-xs text-[var(--color-muted)]">/{cat.slug}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startAddSub(cat.id)}
                        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-2 py-1 text-xs font-medium"
                      >
                        {t(`${Cm}.addSubCategory`)}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(cat)}
                        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-2 py-1 text-xs font-medium"
                      >
                        {t(`${Cm}.editCategory`)}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        disabled={deletingId === cat.id}
                        className="rounded-[var(--radius-btn)] border border-red-500/50 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-600 disabled:opacity-50"
                      >
                        {deletingId === cat.id
                          ? t(`${Cm}.deleting`)
                          : confirmDelete === cat.id
                            ? t(`${Cm}.confirmDeleteRepeat`)
                            : t(`${Cm}.deleteOnce`)}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

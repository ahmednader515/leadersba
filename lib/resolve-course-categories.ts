import type { UserRole } from "@/lib/types";
import {
  categoryIsManageableOnDashboard,
  createCategory,
  findCategoryByNameForDashboard,
} from "@/lib/db";

export async function resolveCourseCategoryIds(
  body: {
    categoryIds?: unknown;
    categoryId?: string | null;
    categoryName?: string;
    categoryNameAr?: string;
    categoryNameEn?: string;
  },
  userId: string,
  role: UserRole,
): Promise<{ ids: string[]; error?: string }> {
  const ids: string[] = [];

  if (Array.isArray(body.categoryIds)) {
    for (const raw of body.categoryIds) {
      const cid = String(raw ?? "").trim();
      if (!cid) continue;
      const ok = await categoryIsManageableOnDashboard(cid, userId, role);
      if (!ok) return { ids: [], error: "القسم غير صالح أو غير مسموح" };
      if (!ids.includes(cid)) ids.push(cid);
    }
  } else if (body.categoryId?.trim()) {
    const cid = body.categoryId.trim();
    const ok = await categoryIsManageableOnDashboard(cid, userId, role);
    if (!ok) return { ids: [], error: "القسم غير صالح أو غير مسموح" };
    ids.push(cid);
  }

  const catNameAr = (body.categoryNameAr ?? body.categoryName)?.trim();
  const catNameEn = (body.categoryNameEn ?? body.categoryName)?.trim();
  if (catNameAr || catNameEn) {
    let cat =
      (catNameAr ? await findCategoryByNameForDashboard(catNameAr, userId, role) : null) ??
      (catNameEn ? await findCategoryByNameForDashboard(catNameEn, userId, role) : null);
    if (!cat) {
      const slugBase = catNameEn || catNameAr || "cat";
      const slugCat =
        slugBase
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^\w\u0600-\u06FF-]+/g, "") || "cat";
      const uniqueSlug = `${slugCat}-${Date.now()}`;
      cat = await createCategory({
        name: catNameEn || catNameAr || slugBase,
        name_ar: catNameAr || catNameEn || slugBase,
        slug: uniqueSlug,
        created_by_id: role === "TEACHER" ? userId : null,
      });
    }
    if (!ids.includes(cat.id)) ids.push(cat.id);
  }

  return { ids };
}

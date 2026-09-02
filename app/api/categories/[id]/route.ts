import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  categoryIsManageableOnDashboard,
  categorySlugExists,
  countChildCategories,
  countCoursesInCategory,
  deleteCategory,
  getCategoryById,
  isValidCategoryParent,
  updateCategory,
} from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "ASSISTANT_ADMIN" && role !== "TEACHER") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "معرّف التصنيف مطلوب" }, { status: 400 });
  }

  const allowed = await categoryIsManageableOnDashboard(id, session.user.id, role);
  if (!allowed) {
    return NextResponse.json({ error: "لا يمكن تعديل هذا التصنيف" }, { status: 403 });
  }

  let body: {
    name?: string;
    nameAr?: string;
    nameEn?: string;
    slug?: string;
    parentId?: string | null;
    order?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const updates: Parameters<typeof updateCategory>[1] = {};
  if (body.nameEn !== undefined || body.nameAr !== undefined || body.name !== undefined) {
    const nameEn = (body.nameEn ?? body.name)?.trim();
    const nameAr = (body.nameAr ?? body.name)?.trim();
    if (nameEn) updates.name = nameEn;
    if (nameAr !== undefined) updates.name_ar = nameAr || nameEn || null;
  }
  if (body.slug !== undefined) {
    const slug = body.slug.trim();
    if (!slug) {
      return NextResponse.json({ error: "الرابط مطلوب" }, { status: 400 });
    }
    if (await categorySlugExists(slug, id)) {
      return NextResponse.json({ error: "الرابط مستخدم مسبقاً" }, { status: 400 });
    }
    updates.slug = slug;
  }
  if (body.order !== undefined) updates.order = body.order;
  if (body.parentId !== undefined) {
    const parentId = body.parentId?.trim() || null;
    if (parentId) {
      const valid = await isValidCategoryParent(id, parentId);
      if (!valid) {
        return NextResponse.json({ error: "لا يمكن جعل التصنيف تابعاً لنفسه أو لأحد أبنائه" }, { status: 400 });
      }
    }
    updates.parent_id = parentId;
  }

  try {
    const updated = await updateCategory(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "فشل تحديث التصنيف" }, { status: 400 });
    }
    const [childCount, courseCount] = await Promise.all([
      countChildCategories(id),
      countCoursesInCategory(id),
    ]);
    return NextResponse.json({ ...updated, childCount, courseCount });
  } catch (e) {
    console.error("API categories [id] PATCH:", e);
    return NextResponse.json({ error: "فشل تحديث التصنيف" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const cat = await getCategoryById(id);
  if (!cat) {
    return NextResponse.json({ error: "التصنيف غير موجود" }, { status: 404 });
  }
  const [childCount, courseCount] = await Promise.all([
    countChildCategories(id),
    countCoursesInCategory(id),
  ]);
  return NextResponse.json({ ...cat, childCount, courseCount });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "ASSISTANT_ADMIN" && role !== "TEACHER") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "معرّف التصنيف مطلوب" }, { status: 400 });
  }

  const allowed = await categoryIsManageableOnDashboard(id, session.user.id, role);
  if (!allowed) {
    return NextResponse.json({ error: "لا يمكن حذف هذا التصنيف" }, { status: 403 });
  }

  try {
    await deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("API categories [id] DELETE:", e);
    return NextResponse.json({ error: "فشل حذف التصنيف" }, { status: 500 });
  }
}

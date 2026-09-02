import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  categorySlugExists,
  createCategory,
  getCategoriesForDashboard,
  getCategoryById,
} from "@/lib/db";
import { slugifyCategoryName } from "@/lib/category-tree";

/** أقسام لوحة الدورات — GET list, POST create */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "ASSISTANT_ADMIN" && role !== "TEACHER") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const categories = await getCategoriesForDashboard(session.user.id, role);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("API categories GET:", error);
    return NextResponse.json({ error: "فشل جلب التصنيفات" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "ASSISTANT_ADMIN" && role !== "TEACHER") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
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

  const nameAr = (body.nameAr ?? body.name)?.trim();
  const nameEn = (body.nameEn ?? body.name)?.trim();
  if (!nameAr && !nameEn) {
    return NextResponse.json({ error: "اسم التصنيف مطلوب" }, { status: 400 });
  }

  const slugBase = body.slug?.trim() || slugifyCategoryName(nameEn || nameAr || "cat");
  let slug = slugBase;
  if (await categorySlugExists(slug)) {
    slug = `${slugBase}-${Date.now()}`;
  }

  const parentId = body.parentId?.trim() || null;
  if (parentId) {
    const parent = await getCategoryById(parentId);
    if (!parent) {
      return NextResponse.json({ error: "التصنيف الأب غير موجود" }, { status: 400 });
    }
  }

  try {
    const cat = await createCategory({
      name: nameEn || nameAr || slugBase,
      name_ar: nameAr || nameEn || slugBase,
      slug,
      order: typeof body.order === "number" ? body.order : 0,
      parent_id: parentId,
      created_by_id: role === "TEACHER" ? session.user.id : null,
    });
    return NextResponse.json(cat);
  } catch (e) {
    console.error("API categories POST:", e);
    return NextResponse.json({ error: "فشل إنشاء التصنيف" }, { status: 500 });
  }
}

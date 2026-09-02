import { unstable_noStore } from "next/cache";
import { getCoursesPublished, getTeacherIdsExcludedFromPublicCourseLists, getUserById, getCategoryBySlug, getCategoryDescendantIds } from "@/lib/db";
import { redirect } from "next/navigation";
import { TeacherCoursesSearch, type TeacherCourseListItem } from "./TeacherCoursesSearch";
import { getLocaleFromCookie, getServerTranslator } from "@/lib/i18n/server";
import { pickLocalizedText } from "@/lib/i18n/localized-field";

/** عدم تخزين الصفحة مؤقتاً — الكورسات الجديدة والمحذوفة تظهر فوراً */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
  const t = await getServerTranslator();
  return {
    title: `${t("common.courses", "Courses")} | ${t("footer.defaultTitle", "My Learning Platform")}`,
    description: t("courses.allCoursesSubtitle", "Choose the right course and start learning step by step"),
  };
}

type Props = { searchParams: Promise<{ category?: string; teacher?: string }> };

export default async function CoursesPage({ searchParams }: Props) {
  unstable_noStore();
  const [t, locale] = await Promise.all([getServerTranslator(), getLocaleFromCookie()]);
  const { category: categorySlug, teacher: teacherId } = await searchParams;
  let courses: Awaited<ReturnType<typeof getCoursesPublished>> = [];
  try {
    courses = await getCoursesPublished(true);
  } catch {
    // DB not connected
  }

  const hideTeacherCreators = await getTeacherIdsExcludedFromPublicCourseLists();

  let teacherName: string | null = null;
  const tid = teacherId?.trim();
  if (tid) {
    const u = await getUserById(tid).catch(() => null);
    if (!u || u.role !== "TEACHER") {
      redirect("/courses");
    }
    teacherName = u.name ?? null;
  }

  let filtered =
    categorySlug?.trim()
      ? await (async () => {
          const cat = await getCategoryBySlug(categorySlug.trim());
          if (!cat) return [] as typeof courses;
          const descendantIds = await getCategoryDescendantIds(cat.id);
          const allowed = new Set([cat.id, ...descendantIds]);
          return courses.filter((c) =>
            ((c as { categories?: { id: string }[] }).categories ?? []).some((cat) => allowed.has(cat.id)),
          );
        })()
      : courses;

  const filterCategory =
    categorySlug?.trim() ? await getCategoryBySlug(categorySlug.trim()) : null;

  if (tid) {
    filtered = filtered.filter((c) => {
      const row = c as { createdById?: string | null; created_by_id?: string | null };
      const creator = row.createdById ?? row.created_by_id ?? null;
      return creator === tid;
    });
  } else if (hideTeacherCreators.size > 0) {
    filtered = filtered.filter((c) => {
      const row = c as { createdById?: string | null; created_by_id?: string | null };
      const creator = row.createdById ?? row.created_by_id ?? null;
      return !creator || !hideTeacherCreators.has(creator);
    });
  }

  const categoryName = filterCategory
    ? pickLocalizedText(locale, filterCategory.name_ar, filterCategory.name)
    : null;

  const pageTitle = teacherName
    ? `${t("courses.teacherCoursesPrefix", "Courses by")} ${teacherName}`
    : categoryName
      ? `${t("courses.categoryCoursesPrefix", "Category courses:")} ${categoryName}`
      : t("courses.allCoursesTitle", "All courses");

  const pageSubtitle = teacherName
    ? t("courses.teacherCoursesSubtitle", "Published courses by this teacher on the platform")
    : categoryName
      ? t("courses.categoryCoursesSubtitle", "Courses for the selected category only")
      : t("courses.allCoursesSubtitle", "Choose the right course and start learning step by step");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[var(--color-foreground)]">{pageTitle}</h1>
        <p className="mt-2 text-[var(--color-muted)]">{pageSubtitle}</p>
      </div>

      {filtered.length > 0 ? (
        <TeacherCoursesSearch
          courses={filtered as TeacherCourseListItem[]}
          groupByCategory={!!tid}
        />
      ) : (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-12 text-center">
          <p className="text-[var(--color-muted)]">
            {tid
              ? t("courses.noTeacherCourses", "No published courses for this teacher right now.")
              : categorySlug?.trim()
                ? t("courses.noCategoryCourses", "No courses in this category right now.")
                : t("courses.noCourses", "No published courses yet. Make sure the database is configured and seed is run.")}
          </p>
        </div>
      )}
    </div>
  );
}

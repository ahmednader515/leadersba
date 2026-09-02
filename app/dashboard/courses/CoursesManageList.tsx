"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";
import { useDashboardTable } from "@/lib/i18n/dashboard-table";
import { fillMessage } from "@/lib/i18n/interpolate";

type CourseRow = {
  id: string;
  title: string;
  titleAr: string | null;
  slug: string;
  isPublished: boolean;
  price: number;
  imageUrl: string | null;
  lessonsCount: number;
  enrollmentsCount: number;
  categories: { id: string; name: string; nameAr?: string | null }[];
};

function CourseTableRow({
  c,
  deletingId,
  confirmDelete,
  onDelete,
  t,
  egp,
}: {
  c: CourseRow;
  deletingId: string | null;
  confirmDelete: string | null;
  onDelete: (id: string) => void;
  t: (k: string, fb?: string) => string;
  egp: string;
}) {
  const L = "dashboard.coursesList";
  return (
    <tr className="border-b border-[var(--color-border)] last:border-0">
      <td className="p-3">
        <div className="flex items-center gap-3">
          {c.imageUrl && (
            <img src={c.imageUrl} alt="" className="h-12 w-20 rounded object-cover" />
          )}
          <span className="font-medium text-[var(--color-foreground)]">
            {c.titleAr ?? c.title}
          </span>
          {c.categories.length > 0 && (
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {c.categories.map((cat) => cat.nameAr ?? cat.name).join(" · ")}
            </p>
          )}
        </div>
      </td>
      <td className="p-3 text-[var(--color-muted)]">{c.lessonsCount}</td>
      <td className="p-3 text-[var(--color-muted)]">{c.enrollmentsCount}</td>
      <td className="p-3">
        {c.price.toFixed(2)} {egp}
      </td>
      <td className="p-3">
        <span
          className={
            c.isPublished
              ? "text-[var(--color-success)]"
              : "text-[var(--color-muted)]"
          }
        >
          {c.isPublished ? t(`${L}.published`) : t(`${L}.draft`)}
        </span>
      </td>
      <td className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/courses/${c.id}/edit`}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-background)]"
          >
            {t(`${L}.edit`)}
          </Link>
          <button
            type="button"
            onClick={() => onDelete(c.id)}
            disabled={deletingId !== null}
            className={
              confirmDelete === c.id
                ? "rounded-[var(--radius-btn)] bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                : "rounded-[var(--radius-btn)] border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
            }
          >
            {deletingId === c.id
              ? t(`${L}.deleting`)
              : confirmDelete === c.id
                ? t(`${L}.clickAgainDelete`)
                : t(`${L}.delete`)}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function CoursesManageList({ courses }: { courses: CourseRow[] }) {
  const router = useRouter();
  const t = useT();
  const L = "dashboard.coursesList";
  const { dir, thClass } = useDashboardTable();
  const egp = t("common.egyptianPoundShort");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => {
      const title = (c.titleAr ?? c.title ?? "").toLowerCase();
      const titleEn = (c.title ?? "").toLowerCase();
      return title.includes(q) || titleEn.includes(q);
    });
  }, [courses, searchQuery]);

  async function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setDeletingId(id);
    const res = await fetch(`/api/dashboard/courses/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmDelete(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? t(`${L}.deleteCourseFailed`));
      return;
    }
    router.refresh();
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <p className="text-[var(--color-muted)]">
          {t(`${L}.emptyAllCourses`)}{" "}
          <Link href="/dashboard/courses/new" className="text-[var(--color-primary)] hover:underline">
            {t(`${L}.createNewCourseLink`)}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="course-search" className="sr-only">
          {t(`${L}.searchCoursesSr`)}
        </label>
        <input
          id="course-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t(`${L}.searchPlaceholder`)}
          className="min-w-[220px] max-w-md flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
        {searchQuery.trim() && (
          <span className="text-sm text-[var(--color-muted)]">
            {fillMessage(t(`${L}.countOf`), { filtered: filteredCourses.length, total: courses.length })}
          </span>
        )}
      </div>
      {filteredCourses.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
          <p className="text-[var(--color-muted)]">{t(`${L}.noCourses`)}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full" dir={dir}>
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]/30">
                <th className={thClass}>{t(`${L}.colThumbTitle`)}</th>
                <th className={thClass}>{t(`${L}.colLessons`)}</th>
                <th className={thClass}>{t(`${L}.colStudents`)}</th>
                <th className={thClass}>{t(`${L}.colPrice`)}</th>
                <th className={thClass}>{t(`${L}.colStatus`)}</th>
                <th className={thClass}>{t(`${L}.colActions`)}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((c) => (
                <CourseTableRow
                  key={c.id}
                  c={c}
                  deletingId={deletingId}
                  confirmDelete={confirmDelete}
                  onDelete={handleDelete}
                  t={t}
                  egp={egp}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

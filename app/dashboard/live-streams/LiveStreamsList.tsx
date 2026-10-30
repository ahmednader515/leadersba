"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useT } from "@/components/LocaleProvider";
import { useDashboardTable, dateLocaleForUi } from "@/lib/i18n/dashboard-table";

type StreamRow = {
  id: string;
  title: string;
  titleAr: string;
  provider: string;
  meetingUrl: string;
  scheduledAt: unknown;
  isPublished: boolean;
  course?: { id: string; title: string; slug: string };
};

export function LiveStreamsList({ streams }: { streams: StreamRow[] }) {
  const router = useRouter();
  const t = useT();
  const L = "dashboard.liveStreamsList";
  const { locale, dir, thClass } = useDashboardTable();
  const dateLocale = dateLocaleForUi(locale);
  const dash = t("dashboard.studentsPage.dash");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = deletingId !== null || updatingId !== null || isRefreshing;

  const handlePublication = async (stream: StreamRow) => {
    setUpdatingId(stream.id);
    setError(null);
    try {
      const res = await fetch(`/api/live-streams/${stream.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !stream.isPublished }),
      });
      if (!res.ok) throw new Error("Publication update failed");
      startTransition(() => router.refresh());
    } catch {
      setError(t(`${L}.publishFailed`));
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (d: unknown) => {
    if (!d) return dash;
    const date = typeof d === "string" ? new Date(d) : (d as Date);
    try {
      return new Intl.DateTimeFormat(dateLocale, { dateStyle: "short", timeStyle: "short" }).format(date);
    } catch {
      return dash;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t(`${L}.confirmDelete`))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/live-streams/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else alert(t(`${L}.deleteFailed`));
    } finally {
      setDeletingId(null);
    }
  };

  if (streams.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[var(--color-muted)]">
        {t(`${L}.emptyHint`)}
      </p>
    );
  }

  return (
    <div>
      {error && <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full text-sm" dir={dir}>
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
              <th className={thClass}>{t(`${L}.colTitle`)}</th>
              <th className={thClass}>{t(`${L}.colProvider`)}</th>
              <th className={thClass}>{t(`${L}.colCourse`)}</th>
              <th className={thClass}>{t(`${L}.colScheduled`)}</th>
              <th className={thClass}>{t(`${L}.colStatus`)}</th>
              <th className={thClass}>{t(`${L}.colActions`)}</th>
            </tr>
          </thead>
          <tbody>
            {streams.map((s) => (
              <tr key={s.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="p-3">{s.titleAr || s.title}</td>
                <td className="p-3">{s.provider === "zoom" ? t(`${L}.providerZoom`) : t(`${L}.providerMeet`)}</td>
                <td className="p-3">{s.course?.title ?? dash}</td>
                <td className="p-3">{formatDate(s.scheduledAt)}</td>
                <td className="p-3">
                  <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${s.isPublished ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                    {t(`${L}.${s.isPublished ? "published" : "unpublished"}`)}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handlePublication(s)}
                      disabled={busy}
                      className="whitespace-nowrap rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-primary)] hover:bg-[var(--color-background)] disabled:opacity-50"
                    >
                      {updatingId === s.id ? t(`${L}.updating`) : t(`${L}.${s.isPublished ? "unpublish" : "publish"}`)}
                    </button>
                    <Link
                      href={`/dashboard/live-streams/${s.id}/edit`}
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      {t(`${L}.edit`)}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      disabled={busy}
                      className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                    >
                      {deletingId === s.id ? t(`${L}.deleting`) : t(`${L}.delete`)}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

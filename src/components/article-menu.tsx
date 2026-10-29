"use client";

import { useRouter } from "next/navigation";

export function ArticleMenu({
  articles,
  currentId,
}: {
  articles: { id: number; title: string; parent_id?: number | null }[];
  currentId: number;
}) {
  const router = useRouter();
  return (
    <select
      value={currentId}
      onChange={(e) => router.push(`/articulo/${e.target.value}`)}
      title="Ver otros artículos"
      className="max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 outline-none focus:border-lbc sm:max-w-72"
    >
      {articles.map((a) => (
        <option key={a.id} value={a.id}>
          {a.parent_id ? `↳ ${a.title}` : a.title}
        </option>
      ))}
    </select>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveArticle, deleteArticle } from "@/app/(app)/admin/actions";
import { cleanArticleHtml } from "@/lib/sanitize";

export function ArticleEditor({
  article,
}: {
  article?: { id: number; title: string; html: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(article?.title ?? "");
  const [html, setHtml] = useState(article?.html ?? "");
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await saveArticle({ id: article?.id, title, html });
      if (!res.ok) return setError(res.error);
      router.push(`/articulo/${res.id}`);
      router.refresh();
    });
  }

  function onDelete() {
    if (!article) return;
    if (!confirm(`¿Eliminar «${article.title}»? No se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteArticle(article.id);
      if (!res.ok) return setError(res.error);
      router.push("/admin/articulos");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título del artículo"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-base font-semibold outline-none focus:border-lbc focus:ring-2 focus:ring-lbc/20"
        />
        <button
          onClick={() => setPreview((v) => !v)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {preview ? "Editar HTML" : "Vista previa"}
        </button>
        <button
          onClick={onSave}
          disabled={pending}
          className="rounded-lg bg-lbc px-4 py-2 text-sm font-semibold text-white hover:bg-lbc-dark disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        {article && (
          <button
            onClick={onDelete}
            disabled={pending}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Eliminar
          </button>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {preview ? (
        <div
          className="article-content rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          dangerouslySetInnerHTML={{ __html: cleanArticleHtml(html) }}
        />
      ) : (
        <>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            spellCheck={false}
            className="min-h-[60vh] w-full rounded-2xl border border-slate-300 bg-white p-4 font-mono text-xs leading-relaxed outline-none focus:border-lbc focus:ring-2 focus:ring-lbc/20"
            placeholder="<p>Contenido del artículo en HTML…</p>"
          />
          <p className="mt-2 text-xs text-slate-400">
            Etiquetas permitidas: p, h2, h3, strong, em, u, ul/ol/li, a, img
            (/media/…), table. El contenido se sanitiza al guardar.
          </p>
        </>
      )}
    </div>
  );
}

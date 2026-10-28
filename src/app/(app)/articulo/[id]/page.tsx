import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cleanArticleHtml } from "@/lib/sanitize";
import { ArticleMenu } from "@/components/article-menu";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: article }, { data: profile }, { data: all }] =
    await Promise.all([
      supabase
        .from("articles")
        .select("id, title, html, position, updated_at")
        .eq("id", numId)
        .single(),
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .single(),
      supabase.from("articles").select("id, title, position").order("position"),
    ]);

  if (!article) notFound();

  const prev = (all ?? []).filter((a) => a.position < article.position).pop();
  const next = (all ?? []).find((a) => a.position > article.position);
  const isAdmin = profile?.role === "admin";

  return (
    <article className="mx-auto max-w-3xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-lbc transition-colors"
        >
          ← Volver a buscar
        </Link>
        <ArticleMenu articles={all ?? []} currentId={article.id} />
      </div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
          {article.title}
        </h1>
        {isAdmin && (
          <Link
            href={`/admin/articulos/${article.id}`}
            className="shrink-0 rounded-lg border border-lbc/30 px-3 py-1.5 text-xs font-semibold text-lbc hover:bg-lbc/10 transition-colors"
          >
            Editar
          </Link>
        )}
      </div>

      <div
        className="article-content rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        dangerouslySetInnerHTML={{ __html: cleanArticleHtml(article.html) }}
      />

      <div className="mt-6 flex items-center justify-between gap-3 text-sm">
        {prev ? (
          <Link
            href={`/articulo/${prev.id}`}
            className="max-w-[45%] truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:border-lbc hover:text-lbc"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/articulo/${next.id}`}
            className="max-w-[45%] truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:border-lbc hover:text-lbc text-right"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>

      <p className="mt-4 text-center text-[11px] text-slate-400">
        Última actualización:{" "}
        {new Date(article.updated_at).toLocaleDateString("es-BO")}
      </p>
    </article>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminArticlesPage() {
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, updated_at")
    .order("position");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contenido</h1>
          <p className="mt-1 text-sm text-slate-500">
            {articles?.length ?? 0} artículos
          </p>
        </div>
        <Link
          href="/admin/articulos/nuevo"
          className="rounded-lg bg-lbc px-4 py-2 text-sm font-semibold text-white hover:bg-lbc-dark transition-colors"
        >
          + Nuevo artículo
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ul className="divide-y divide-slate-100">
          {(articles ?? []).map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {a.title}
                </p>
                <p className="text-xs text-slate-400">
                  Editado: {new Date(a.updated_at).toLocaleDateString("es-BO")}
                </p>
              </div>
              <Link
                href={`/admin/articulos/${a.id}`}
                className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-lbc hover:bg-lbc/10 transition-colors"
              >
                Editar
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

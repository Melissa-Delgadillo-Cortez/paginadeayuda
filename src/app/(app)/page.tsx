import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchBox } from "@/components/search-box";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("id, title")
    .order("position");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 mt-2 text-center sm:mt-6">
        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
          ¿Qué necesitas encontrar?
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Busca en todos los procedimientos, pólizas e instructivos.
        </p>
      </div>

      <SearchBox />

      <div className="mt-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Todos los temas
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(articles ?? []).map((a) => (
            <Link
              key={a.id}
              href={`/articulo/${a.id}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:border-lbc hover:text-lbc-dark transition-colors"
            >
              {a.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

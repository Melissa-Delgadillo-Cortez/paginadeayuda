import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchBox } from "@/components/search-box";

const WEEK = 7 * 86400000;

export default async function HomePage() {
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });

  // eslint-disable-next-line react-hooks/purity -- server component: una vez por request
  const now = Date.now();

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
          Todos los temas{" "}
          <span className="normal-case font-normal text-slate-400">
            (recién actualizados primero)
          </span>
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(articles ?? []).map((a) => {
            const ts = new Date(a.updated_at);
            const fresh = now - ts.getTime() < WEEK;
            return (
              <Link
                key={a.id}
                href={`/articulo/${a.id}`}
                className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition-colors ${
                  fresh
                    ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 hover:border-emerald-400"
                    : "border-slate-200 bg-white text-slate-700 hover:border-lbc hover:text-lbc-dark"
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span>{a.title}</span>
                  {fresh && (
                    <span className="mt-0.5 shrink-0 rounded-full bg-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                      NUEVO
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-[10px] font-normal text-slate-400">
                  {fresh ? "Actualizado" : "Editado"}:{" "}
                  {ts.toLocaleString("es-BO", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

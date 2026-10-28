"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cleanSnippet } from "@/lib/snippet-client";

type Result = { id: number; title: string; snippet: string; rank: number };

export function SearchModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>(null);

  // Atajo "/" abre el buscador; Esc cierra
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "/" && !open && !["INPUT", "TEXTAREA"].includes(tag)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function onQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("search_articles", { q });
      if (!error) {
        setResults(data ?? []);
        setSearched(true);
      }
      setSearching(false);
    }, 200);
  }

  function go(id: number) {
    setOpen(false);
    setQuery("");
    router.push(`/articulo/${id}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Buscar ( / )"
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-lbc transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="hidden sm:inline">Buscar</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto mt-20 w-[92%] max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl bg-white shadow-2xl">
              <div className="relative border-b border-slate-100">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={onQueryChange}
                  placeholder="Buscar en toda la página de ayuda…  (Esc para cerrar)"
                  className="w-full rounded-t-2xl py-4 pl-12 pr-4 text-base outline-none"
                />
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-3">
                {searching && (
                  <p className="px-2 py-3 text-sm text-slate-500">Buscando…</p>
                )}
                {!searching && searched && results.length === 0 && (
                  <p className="px-2 py-6 text-center text-sm text-slate-500">
                    Sin resultados para «{query}».
                  </p>
                )}
                {!searching && query.trim().length < 2 && !searched && (
                  <p className="px-2 py-6 text-center text-xs text-slate-400">
                    Escribe al menos 2 letras para buscar en todos los
                    procedimientos.
                  </p>
                )}
                <ul className="space-y-1.5">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => go(r.id)}
                        className="block w-full rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-lbc hover:bg-lbc/5 transition-colors"
                      >
                        <p className="font-semibold text-lbc-dark text-sm">
                          {r.title}
                        </p>
                        <p
                          className="mt-0.5 text-xs text-slate-500 leading-relaxed [&_b]:text-lbc [&_b]:bg-yellow-100 [&_b]:rounded [&_b]:px-0.5"
                          dangerouslySetInnerHTML={{
                            __html: cleanSnippet(r.snippet),
                          }}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

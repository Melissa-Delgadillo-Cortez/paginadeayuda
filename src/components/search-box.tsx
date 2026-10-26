"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cleanSnippet } from "@/lib/snippet-client";

type Result = { id: number; title: string; snippet: string; rank: number };

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>(null);

  // Atajo "/" para enfocar el buscador
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  return (
    <div>
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          width="20"
          height="20"
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
          placeholder="Buscar procedimiento, póliza, contacto…  ( / )"
          className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-base shadow-sm outline-none focus:border-lbc focus:ring-2 focus:ring-lbc/20"
          autoFocus
        />
      </div>

      {searching && (
        <p className="mt-3 text-sm text-slate-500">Buscando…</p>
      )}

      {searched && !searching && (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              Sin resultados para «{query}». Prueba con otras palabras.
            </p>
          ) : (
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/articulo/${r.id}`}
                    className="block rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-lbc hover:shadow transition-all"
                  >
                    <p className="font-semibold text-lbc-dark text-sm">
                      {r.title}
                    </p>
                    <p
                      className="mt-1 text-xs text-slate-500 leading-relaxed [&_b]:text-lbc [&_b]:bg-yellow-100 [&_b]:rounded [&_b]:px-0.5"
                      dangerouslySetInnerHTML={{
                        __html: cleanSnippet(r.snippet),
                      }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

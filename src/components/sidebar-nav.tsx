"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { id: number; title: string };

export function SidebarNav({
  articles,
  isAdmin,
}: {
  articles: Item[];
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [filter, setFilter] = useState("");

  const q = filter.trim().toLowerCase();
  const visible = q
    ? articles.filter((a) => a.title.toLowerCase().includes(q))
    : articles;

  return (
    <nav className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="p-3 pb-2">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar índice…"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-lbc"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Índice ({visible.length})
        </p>
        <ul className="space-y-0.5">
          {visible.map((a) => {
            const active = pathname === `/articulo/${a.id}`;
            return (
              <li key={a.id}>
                <Link
                  href={`/articulo/${a.id}`}
                  className={`block rounded-lg px-2.5 py-1.5 text-xs leading-snug transition-colors ${
                    active
                      ? "bg-lbc text-white font-semibold"
                      : "text-slate-600 hover:bg-lbc/10 hover:text-lbc-dark"
                  }`}
                >
                  {a.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {isAdmin && (
        <div className="border-t border-slate-200 p-3">
          <Link
            href="/admin/articulos/nuevo"
            className="block rounded-lg bg-lbc px-3 py-2 text-center text-xs font-semibold text-white hover:bg-lbc-dark transition-colors"
          >
            + Agregar artículo
          </Link>
        </div>
      )}
    </nav>
  );
}

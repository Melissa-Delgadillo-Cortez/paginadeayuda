"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { id: number; title: string; parent_id: number | null };

function TreeItem({
  item,
  articles,
  pathname,
  expanded,
  onToggle,
  depth,
}: {
  item: NavItem;
  articles: NavItem[];
  pathname: string;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  depth: number;
}) {
  const children = articles.filter((a) => a.parent_id === item.id);
  const active = pathname === `/articulo/${item.id}`;
  const isOpen = expanded.has(item.id);

  return (
    <li>
      <div
        className={`flex items-center rounded-lg transition-colors ${
          active ? "bg-lbc text-white" : "text-slate-600 hover:bg-lbc/10"
        }`}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        {children.length > 0 ? (
          <button
            onClick={() => onToggle(item.id)}
            aria-label={isOpen ? "Contraer" : "Desplegar"}
            className={`shrink-0 rounded p-1 text-[9px] transition-transform ${
              active ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-lbc"
            }`}
          >
            {isOpen ? "▼" : "▶"}
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}
        <Link
          href={`/articulo/${item.id}`}
          className={`min-w-0 flex-1 truncate py-1.5 pr-2 text-xs leading-snug ${
            active ? "font-semibold" : "hover:text-lbc-dark"
          }`}
        >
          {item.title}
          {children.length > 0 && (
            <span
              className={`ml-1 text-[9px] ${active ? "text-white/70" : "text-slate-400"}`}
            >
              ({children.length})
            </span>
          )}
        </Link>
      </div>
      {isOpen &&
        children.map((c) => (
          <ul key={c.id}>
            <TreeItem
              item={c}
              articles={articles}
              pathname={pathname}
              expanded={expanded}
              onToggle={onToggle}
              depth={depth + 1}
            />
          </ul>
        ))}
    </li>
  );
}

export function SidebarNav({
  articles,
  isAdmin,
}: {
  articles: NavItem[];
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    // Auto-desplegar la cadena de padres del artículo activo
    const open = new Set<number>();
    const match = /\/articulo\/(\d+)/.exec(pathname);
    if (match) {
      let cur = articles.find((a) => a.id === Number(match[1]));
      while (cur?.parent_id) {
        open.add(cur.parent_id);
        cur = articles.find((a) => a.id === cur!.parent_id);
      }
    }
    return open;
  });

  function onToggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const q = filter.trim().toLowerCase();
  const roots = articles.filter((a) => !a.parent_id);
  const flatMatches = q
    ? articles.filter((a) => a.title.toLowerCase().includes(q))
    : null;

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
          Índice ({flatMatches ? flatMatches.length : roots.length})
        </p>
        <ul className="space-y-0.5">
          {flatMatches
            ? flatMatches.map((a) => {
                const parent = articles.find((p) => p.id === a.parent_id);
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
                      {parent && (
                        <span className="text-slate-400">{parent.title} › </span>
                      )}
                      {a.title}
                    </Link>
                  </li>
                );
              })
            : roots.map((a) => (
                <TreeItem
                  key={a.id}
                  item={a}
                  articles={articles}
                  pathname={pathname}
                  expanded={expanded}
                  onToggle={onToggle}
                  depth={0}
                />
              ))}
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

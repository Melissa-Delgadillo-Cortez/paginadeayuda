"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { saveArticleTree } from "@/app/(app)/admin/actions";

export type NavItem = { id: number; title: string; parent_id: number | null };

type DropTarget =
  | { kind: "into"; id: number }
  | { kind: "before"; parent: number | null; id: number }
  | { kind: "append"; parent: number | null };

/** ¿`candidate` es el propio `id` o uno de sus descendientes? */
function isSelfOrDescendant(
  items: NavItem[],
  id: number,
  candidate: number | null
): boolean {
  let cur = candidate;
  while (cur !== null) {
    if (cur === id) return true;
    cur = items.find((a) => a.id === cur)?.parent_id ?? null;
  }
  return false;
}

function TreeItem({
  item,
  articles,
  pathname,
  expanded,
  onToggle,
  depth,
  dnd,
}: {
  item: NavItem;
  articles: NavItem[];
  pathname: string;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  depth: number;
  dnd: DndCtx;
}) {
  const children = articles.filter((a) => a.parent_id === item.id);
  const active = pathname === `/articulo/${item.id}`;
  const isOpen = expanded.has(item.id);
  const isDrag = dnd.dragId === item.id;
  const isOver =
    dnd.over?.kind === "into" && dnd.over.id === item.id;

  return (
    <li>
      {/* Zona de drop: insertar ANTES de este ítem (mismo nivel/padre) */}
      {dnd.dragId !== null && (
        <div
          className={`h-1.5 -my-0.5 rounded transition-colors ${
            dnd.over?.kind === "before" && dnd.over.id === item.id
              ? "bg-lbc"
              : "hover:bg-lbc/30"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            dnd.setOver({ kind: "before", parent: item.parent_id, id: item.id });
          }}
          onDrop={(e) => {
            e.preventDefault();
            dnd.onDrop({ kind: "before", parent: item.parent_id, id: item.id });
          }}
        />
      )}
      <div
        draggable={dnd.enabled}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          dnd.setDragId(item.id);
        }}
        onDragEnd={() => {
          dnd.setDragId(null);
          dnd.setOver(null);
        }}
        onDragOver={(e) => {
          if (!dnd.enabled || dnd.dragId === null) return;
          if (isSelfOrDescendant(articles, dnd.dragId, item.id)) return;
          e.preventDefault();
          e.stopPropagation();
          dnd.setOver({ kind: "into", id: item.id });
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dnd.onDrop({ kind: "into", id: item.id });
        }}
        className={`flex items-center rounded-lg transition-colors ${
          active ? "bg-lbc text-white" : "text-slate-600 hover:bg-lbc/10"
        } ${isDrag ? "opacity-40" : ""} ${
          isOver ? "ring-2 ring-lbc ring-inset bg-lbc/10" : ""
        } ${dnd.enabled ? "cursor-grab active:cursor-grabbing" : ""}`}
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
          draggable={false}
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
        {dnd.enabled && (
          <span className="mr-1.5 shrink-0 text-[10px] text-slate-300" title="Arrastrar">
            ⠿
          </span>
        )}
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
              dnd={dnd}
            />
          </ul>
        ))}
      {/* Zona de drop al final del último hijo expandido */}
      {isOpen && children.length > 0 && dnd.dragId !== null && (
        <div
          className={`h-1.5 -my-0.5 ml-4 rounded transition-colors ${
            dnd.over?.kind === "append" && dnd.over.parent === item.id
              ? "bg-lbc"
              : "hover:bg-lbc/30"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            dnd.setOver({ kind: "append", parent: item.id });
          }}
          onDrop={(e) => {
            e.preventDefault();
            dnd.onDrop({ kind: "append", parent: item.id });
          }}
        />
      )}
    </li>
  );
}

type DndCtx = {
  enabled: boolean;
  dragId: number | null;
  over: DropTarget | null;
  setDragId: (v: number | null) => void;
  setOver: (v: DropTarget | null) => void;
  onDrop: (t: DropTarget) => void;
};

export function SidebarNav({
  articles,
  isAdmin,
}: {
  articles: NavItem[];
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [over, setOver] = useState<DropTarget | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(() => {
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

  function onDrop(target: DropTarget) {
    const drag = dragId;
    setDragId(null);
    setOver(null);
    if (drag === null || pending) return;
    if (target.kind === "into" && isSelfOrDescendant(articles, drag, target.id))
      return;
    if (target.kind === "before" && target.id === drag) return;

    const newParent = target.kind === "into" ? target.id : target.parent;

    // Orden dentro de cada grupo de hermanos, sin el nodo arrastrado
    const orderIn = new Map<number | null, number[]>();
    articles.forEach((a) => {
      if (a.id === drag) return;
      const pid = a.parent_id;
      orderIn.set(pid, [...(orderIn.get(pid) ?? []), a.id]);
    });
    // Insertar el nodo en su nuevo grupo/posición
    const group = orderIn.get(newParent) ?? [];
    if (target.kind === "before") {
      const idx = group.indexOf(target.id);
      group.splice(idx === -1 ? group.length : idx, 0, drag);
    } else {
      group.push(drag);
    }
    orderIn.set(newParent, group);

    // Aplanar el árbol (DFS desde raíces) → orden visual final
    const payload: { id: number; parent_id: number | null }[] = [];
    const walk = (pid: number | null) => {
      for (const id of orderIn.get(pid) ?? []) {
        payload.push({ id, parent_id: pid });
        walk(id);
      }
    };
    walk(null);

    if (newParent !== null)
      setExpanded((prev) => new Set(prev).add(newParent));

    startTransition(async () => {
      const res = await saveArticleTree(payload);
      setMsg(res.ok ? "Índice actualizado" : res.error);
      setTimeout(() => setMsg(null), 3000);
      router.refresh();
    });
  }

  const dnd: DndCtx = {
    enabled: isAdmin && !flatMatches,
    dragId,
    over,
    setDragId,
    setOver,
    onDrop,
  };

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
        {isAdmin && (
          <p className="mt-1 px-1 text-[10px] text-slate-400">
            ⠿ Arrastra para reordenar · suelta sobre un artículo para meterlo dentro
          </p>
        )}
        {msg && (
          <p className="mt-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
            {msg}
          </p>
        )}
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
                  dnd={dnd}
                />
              ))}
          {/* Zona de drop al final de la lista raíz */}
          {isAdmin && !flatMatches && dragId !== null && (
            <div
              className={`h-2 rounded transition-colors ${
                over?.kind === "append" && over.parent === null
                  ? "bg-lbc"
                  : "hover:bg-lbc/30"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver({ kind: "append", parent: null });
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDrop({ kind: "append", parent: null });
              }}
            />
          )}
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

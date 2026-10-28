"use client";

import { useState, useTransition } from "react";
import { saveLink, deleteLink } from "@/app/(app)/admin/actions";

type LinkRow = { id: number; name: string; url: string; position: number };

export function LinksManager({
  links,
  isAdmin,
}: {
  links: LinkRow[];
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Partial<LinkRow> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  }

  function onSave() {
    if (!editing) return;
    setErr(null);
    startTransition(async () => {
      const res = await saveLink({
        id: editing.id,
        name: editing.name ?? "",
        url: editing.url ?? "",
        position: editing.position ?? links.length,
      });
      if (!res.ok) return setErr(res.error);
      setEditing(null);
      flash("Enlace guardado.");
    });
  }

  return (
    <div>
      {err && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {err}
        </p>
      )}
      {msg && (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {msg}
        </p>
      )}

      {isAdmin && (
        <div className="mb-4">
          <button
            onClick={() => setEditing({ name: "", url: "" })}
            className="rounded-lg bg-lbc px-4 py-2 text-sm font-semibold text-white hover:bg-lbc-dark"
          >
            + Nuevo enlace
          </button>
        </div>
      )}

      {editing && (
        <div className="mb-5 rounded-2xl border border-lbc/40 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">
            {editing.id ? "Editar enlace" : "Nuevo enlace"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-500">
              Nombre visible (ej. FACEBOOK)
              <input
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              URL (ej. https://facebook.com/lbcseguros)
              <input
                value={editing.url ?? ""}
                onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={onSave}
              disabled={pending}
              className="rounded-lg bg-lbc px-4 py-2 text-sm font-semibold text-white hover:bg-lbc-dark disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {links.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
          Aún no hay enlaces.{isAdmin ? " Agrega el primero con «+ Nuevo enlace»." : ""}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <div
              key={l.id}
              className="group relative rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-lbc hover:shadow"
            >
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-5 py-4"
              >
                <span className="font-bold text-slate-800 group-hover:text-lbc">
                  {l.name}
                </span>
                <span className="text-slate-300 group-hover:text-lbc">↗</span>
              </a>
              {isAdmin && (
                <div className="flex gap-1 border-t border-slate-100 px-3 py-1.5">
                  <button
                    onClick={() => setEditing({ ...l })}
                    className="rounded-md px-2 py-1 text-xs text-lbc hover:bg-lbc/10"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar el enlace ${l.name}?`))
                        startTransition(async () => {
                          const res = await deleteLink(l.id);
                          if (!res.ok) setErr(res.error);
                          else flash("Enlace eliminado.");
                        });
                    }}
                    disabled={pending}
                    className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

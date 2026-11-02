"use client";

import { useState, useTransition } from "react";
import {
  createPendiente,
  gestionarPendiente,
  deletePendiente,
  clearGestionados,
} from "@/app/(app)/admin/actions";
import { fmtDateTimeBO } from "@/lib/dates";

export type Pendiente = {
  id: number;
  title: string;
  detail: string;
  created_email: string;
  created_name: string;
  created_at: string;
  done: boolean;
  done_email: string;
  done_name: string;
  done_at: string | null;
  done_note: string;
};

export function PendientesView({
  rows,
  isAdmin,
}: {
  rows: Pendiente[];
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [gestId, setGestId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const pendientes = rows.filter((r) => !r.done);
  const gestionados = rows.filter((r) => r.done);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  }

  function onCreate() {
    if (!title.trim()) return setErr("Escribe el pendiente.");
    setErr(null);
    startTransition(async () => {
      const res = await createPendiente({ title, detail });
      if (!res.ok) return setErr(res.error);
      setTitle("");
      setDetail("");
      setShowForm(false);
      flash("Pendiente publicado para todos.");
    });
  }

  function onGestionar(id: number) {
    if (!note.trim()) return setErr("Explica qué gestión se hizo.");
    setErr(null);
    startTransition(async () => {
      const res = await gestionarPendiente(id, note);
      if (!res.ok) return setErr(res.error);
      setGestId(null);
      setNote("");
      flash("Marcado como gestionado.");
    });
  }

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          + Nuevo pendiente
        </button>
      </div>

      {err && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>
      )}
      {msg && (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>
      )}

      {showForm && (
        <div className="mb-5 rounded-2xl border border-red-300 bg-red-50/50 p-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pendiente (ej. Revisar caso fubode de anoche)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-red-400"
          />
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            placeholder="Detalle: qué pasó, qué se necesita, para cuándo…"
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={onCreate}
              disabled={pending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {pending ? "Publicando…" : "Publicar"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Pendientes activos (rojo) */}
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-500">
        Sin gestionar ({pendientes.length})
      </h2>
      <div className="space-y-3">
        {pendientes.length === 0 && (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            No hay pendientes. 🎉
          </p>
        )}
        {pendientes.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border-2 border-red-400 bg-red-50 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-red-800">⚠ {p.title}</p>
                {p.detail && (
                  <p className="mt-1 text-sm text-red-700/90 whitespace-pre-wrap">{p.detail}</p>
                )}
                <p className="mt-1.5 text-[11px] text-red-400">
                  {p.created_name || p.created_email} · {fmtDateTimeBO(p.created_at)}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    if (confirm("¿Eliminar este pendiente?"))
                      startTransition(async () => {
                        const res = await deletePendiente(p.id);
                        if (!res.ok) setErr(res.error);
                      });
                  }}
                  className="shrink-0 text-xs text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              )}
            </div>
            {gestId === p.id ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-white p-3">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="¿Qué gestión se hizo? (obligatorio)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => onGestionar(p.id)}
                    disabled={pending}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {pending ? "Guardando…" : "Confirmar gestión"}
                  </button>
                  <button
                    onClick={() => setGestId(null)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setGestId(p.id);
                  setNote("");
                  setErr(null);
                }}
                className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                ✓ Gestionar
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Historial */}
      {gestionados.length > 0 && (
        <>
          <div className="mb-2 mt-6 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Gestionados
            </h2>
            {isAdmin && (
              <button
                onClick={() => {
                  if (confirm("¿Borrar TODO el historial de gestionados?"))
                    startTransition(async () => {
                      const res = await clearGestionados();
                      if (!res.ok) setErr(res.error);
                      else flash("Historial vaciado.");
                    });
                }}
                disabled={pending}
                className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Vaciar gestionados
              </button>
            )}
          </div>
          <div className="space-y-2">
            {gestionados.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 opacity-80"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-700 line-through">
                    {p.title}
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (confirm("¿Eliminar este registro?"))
                          startTransition(async () => {
                            const res = await deletePendiente(p.id);
                            if (!res.ok) setErr(res.error);
                          });
                      }}
                      className="shrink-0 text-xs text-slate-300 hover:text-red-500"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Dejado por {p.created_name || p.created_email} ·{" "}
                  {fmtDateTimeBO(p.created_at)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  <span className="font-semibold text-emerald-700">
                    Gestionado por {p.done_name || p.done_email}
                  </span>{" "}
                  · {p.done_at ? fmtDateTimeBO(p.done_at) : ""}
                </p>
                {p.done_note && (
                  <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {p.done_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

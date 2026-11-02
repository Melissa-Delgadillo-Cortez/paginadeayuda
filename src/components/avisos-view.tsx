"use client";

import { useState, useTransition } from "react";
import { createAviso, deleteAviso } from "@/app/(app)/admin/actions";
import { fmtDateBO, fmtDateTimeBO } from "@/lib/dates";

type Aviso = {
  id: number;
  person: string;
  tipo: string;
  detail: string;
  since_date: string | null;
  until_date: string | null;
  created_email: string;
  created_name: string;
  created_at: string;
};

const TIPOS: Record<string, { label: string; cls: string }> = {
  ausente: { label: "Ausente", cls: "bg-amber-100 text-amber-700" },
  vacaciones: { label: "Vacaciones", cls: "bg-sky-100 text-sky-700" },
  otro: { label: "Otro", cls: "bg-slate-100 text-slate-600" },
};

export function AvisosView({
  rows,
  isAdmin,
}: {
  rows: Aviso[];
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [person, setPerson] = useState("");
  const [tipo, setTipo] = useState<"ausente" | "vacaciones" | "otro">("ausente");
  const [detail, setDetail] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const activos = rows.filter((r) => !r.until_date || r.until_date >= today);
  const vencidos = rows.filter((r) => r.until_date && r.until_date < today);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  }

  function onCreate() {
    if (!person.trim()) return setErr("Indica el nombre del ejecutivo.");
    setErr(null);
    startTransition(async () => {
      const res = await createAviso({
        person,
        tipo,
        detail,
        since_date: since || null,
        until_date: until || null,
      });
      if (!res.ok) return setErr(res.error);
      setPerson("");
      setDetail("");
      setSince("");
      setUntil("");
      setTipo("ausente");
      setShowForm(false);
      flash("Aviso publicado.");
    });
  }

  return (
    <div>
      {isAdmin && (
        <div className="mb-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-lbc px-4 py-2 text-sm font-semibold text-white hover:bg-lbc-dark"
          >
            + Nuevo aviso
          </button>
        </div>
      )}

      {err && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>
      )}
      {msg && (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>
      )}

      {isAdmin && showForm && (
        <div className="mb-5 rounded-2xl border border-lbc/40 bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="Nombre del ejecutivo"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
            />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
            >
              <option value="ausente">Ausente</option>
              <option value="vacaciones">Vacaciones</option>
              <option value="otro">Otro</option>
            </select>
            <label className="text-xs font-medium text-slate-500">
              Desde (opcional)
              <input
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Hasta (opcional)
              <input
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
              />
            </label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={2}
              placeholder="Detalle (motivo, cobertura, contacto…)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc sm:row-span-2"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={onCreate}
              disabled={pending}
              className="rounded-lg bg-lbc px-4 py-2 text-sm font-semibold text-white hover:bg-lbc-dark disabled:opacity-60"
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

      {activos.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          No hay avisos activos.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {activos.map((a) => {
          const t = TIPOS[a.tipo] ?? TIPOS.otro;
          return (
            <div
              key={a.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-slate-800">{a.person}</p>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.cls}`}>
                    {t.label}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar el aviso de ${a.person}?`))
                          startTransition(async () => {
                            const res = await deleteAviso(a.id);
                            if (!res.ok) setErr(res.error);
                          });
                      }}
                      className="text-xs text-slate-300 hover:text-red-500"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              {a.detail && (
                <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{a.detail}</p>
              )}
              <p className="mt-1.5 text-[11px] text-slate-400">
                {(a.since_date || a.until_date) &&
                  `${a.since_date ? fmtDateBO(a.since_date + "T12:00:00Z") : "…"} → ${a.until_date ? fmtDateBO(a.until_date + "T12:00:00Z") : "…"} · `}
                {a.created_name || a.created_email} · {fmtDateTimeBO(a.created_at)}
              </p>
            </div>
          );
        })}
      </div>

      {vencidos.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Vencidos
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {vencidos.map((a) => {
              const t = TIPOS[a.tipo] ?? TIPOS.otro;
              return (
                <div
                  key={a.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 opacity-60"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-500">{a.person}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.cls}`}>
                      {t.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Hasta {a.until_date ? fmtDateBO(a.until_date + "T12:00:00Z") : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

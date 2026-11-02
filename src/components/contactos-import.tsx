"use client";

import { useState, useTransition } from "react";
import { importContacts } from "@/app/(app)/admin/actions";

type Row = { name: string; since: string | null; until: string | null };

/** Panel de importación de turnos de ejecutivos por Excel (solo admin). */
export function ContactosImport({
  areas,
  grps,
}: {
  areas: string[];
  grps: Record<string, string[]>;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [area, setArea] = useState(areas[0] ?? "");
  const [grp, setGrp] = useState("");
  const [customArea, setCustomArea] = useState(false);
  const [customGrp, setCustomGrp] = useState(false);
  const [sheet, setSheet] = useState("");
  const [sheets, setSheets] = useState<{ name: string; rows: Row[] }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const rows = sheets.find((s) => s.name === sheet)?.rows ?? [];

  async function onFile(f: File | undefined) {
    if (!f) return;
    setErr(null);
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/parse-contactos", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) return setErr(json.error ?? "Error leyendo el archivo");
    setSheets(json.sheets ?? []);
    setSheet((json.sheets ?? [])[0]?.name ?? "");
  }

  function onImport() {
    if (!area.trim()) return setErr("Escribe el área.");
    setErr(null);
    startTransition(async () => {
      const res = await importContacts({ area, grp, rows });
      if (!res.ok) return setErr(res.error);
      setSheets([]);
      setOpen(false);
      setMsg(`Importado: ${rows.length} ejecutivos en ${area}${grp ? `/${grp}` : ""}`);
      setTimeout(() => setMsg(null), 5000);
    });
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-lbc/40 bg-lbc/5 px-4 py-2 text-sm font-semibold text-lbc hover:bg-lbc/10"
      >
        ⬆ Importar Excel de turnos
      </button>

      {msg && (
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>
      )}
      {err && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>
      )}

      {open && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium text-slate-500">
              Área *
              {customArea ? (
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Nueva área…"
                  autoFocus
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
                />
              ) : (
                <select
                  value={area}
                  onChange={(e) => {
                    if (e.target.value === "__nueva__") {
                      setCustomArea(true);
                      setArea("");
                    } else {
                      setArea(e.target.value);
                      setGrp("");
                    }
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
                >
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                  <option value="__nueva__">＋ Nueva área…</option>
                </select>
              )}
            </label>
            <label className="text-xs font-medium text-slate-500">
              Ciudad / Grupo
              {customGrp ? (
                <input
                  value={grp}
                  onChange={(e) => setGrp(e.target.value)}
                  placeholder="Nueva ciudad…"
                  autoFocus
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
                />
              ) : (
                <select
                  value={grp}
                  onChange={(e) => {
                    if (e.target.value === "__nueva__") {
                      setCustomGrp(true);
                      setGrp("");
                    } else setGrp(e.target.value);
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
                >
                  <option value="">(sin grupo)</option>
                  {(grps[area] ?? []).map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value="__nueva__">＋ Nueva…</option>
                </select>
              )}
            </label>
            <label className="text-xs font-medium text-slate-500">
              Excel (.xlsx)
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => onFile(e.target.files?.[0])}
                className="mt-1 block w-full text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-lbc file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />
            </label>
          </div>

          {sheets.length > 0 && (
            <>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-slate-500">Hoja:</span>
                <select
                  value={sheet}
                  onChange={(e) => setSheet(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-lbc"
                >
                  {sheets.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">{rows.length} ejecutivos</span>
              </div>
              <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-100">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Ejecutivo</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Desde</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Hasta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 font-medium text-slate-700">{r.name}</td>
                        <td className="px-3 py-1.5 text-slate-500">{r.since ?? "—"}</td>
                        <td className="px-3 py-1.5 text-slate-500">{r.until ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onImport}
                  disabled={pending || rows.length === 0}
                  className="rounded-lg bg-lbc px-4 py-2 text-sm font-semibold text-white hover:bg-lbc-dark disabled:opacity-60"
                >
                  {pending ? "Importando…" : `Importar ${rows.length} turnos`}
                </button>
                <button
                  onClick={() => {
                    setSheets([]);
                    setOpen(false);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600"
                >
                  Cancelar
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Los ejecutivos nuevos se crean solos; los existentes se actualizan con las fechas del Excel.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

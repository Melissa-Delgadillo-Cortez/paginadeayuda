"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Contact = {
  id: number;
  area: string;
  grp: string;
  person: string;
  phone: string;
  email: string;
  support_name: string;
  support_phone: string;
  support_email: string;
  escalation: { name: string; phone: string; email: string }[];
  start_at: string | null;
  end_at: string | null;
  extra: { label: string; value: string }[];
  position: number;
};

const DAY = 86400000;
const RED_DAYS = 3;

function daysLeft(endAt: string, now: number) {
  return (new Date(endAt).getTime() - now) / DAY;
}
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("es-BO", {
    day: "numeric",
    month: "short",
  });
const fmtFull = (iso: string) =>
  new Date(iso).toLocaleDateString("es-BO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function ContactsView({
  areas,
  isAdmin,
  now,
}: {
  areas: string[];
  isAdmin: boolean;
  now: number;
}) {
  const [area, setArea] = useState(areas[0] ?? "");
  const [grp, setGrp] = useState("");
  const [filter, setFilter] = useState("");
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const cache = useRef(new Map<string, Contact[]>());

  useEffect(() => {
    let alive = true;
    if (cache.current.has(area)) return;
    const supabase = createClient();
    supabase
      .from("contacts")
      .select("*")
      .eq("area", area)
      .order("position")
      .then(({ data }) => {
        if (!alive) return;
        cache.current.set(area, data ?? []);
        setRows(data ?? []);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [area]);

  function selectArea(a: string) {
    setArea(a);
    setGrp("");
    const cached = cache.current.get(a);
    if (cached) {
      setRows(cached);
      setLoading(false);
    } else {
      setRows([]);
      setLoading(true);
    }
  }

  const isRotation = rows.some((r) => r.end_at);
  const active = rows.filter(
    (r) =>
      r.start_at && r.end_at &&
      new Date(r.start_at).getTime() <= now &&
      new Date(r.end_at).getTime() >= now
  );
  const upcoming = rows
    .filter((r) => r.start_at && new Date(r.start_at).getTime() > now)
    .sort((a, b) => a.start_at!.localeCompare(b.start_at!));

  const groups = [...new Set(rows.map((r) => r.grp).filter(Boolean))];
  const grpStatus = (g: string) => {
    const act = active.find((r) => r.grp === g);
    if (!act?.end_at) return null;
    return daysLeft(act.end_at, now);
  };

  const q = filter.trim().toLowerCase();
  const matchFilter = (r: Contact) =>
    (!grp || r.grp === grp) &&
    (!q ||
      [r.person, r.grp, r.phone, r.email, r.support_name]
        .join(" ")
        .toLowerCase()
        .includes(q));

  const directoryRows = rows.filter((r) => !r.end_at && matchFilter(r));

  return (
    <div>
      {/* Pestañas de área */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        {areas.map((a) => (
          <button
            key={a}
            onClick={() => selectArea(a)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              a === area
                ? "bg-lbc text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-lbc hover:text-lbc"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Filtros: ciudad + texto */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por nombre, teléfono…"
          className="w-52 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-lbc"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setGrp("")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !grp ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todas
          </button>
          {groups.map((g) => {
            const dl = grpStatus(g);
            const ending = dl !== null && dl <= RED_DAYS;
            return (
              <button
                key={g}
                onClick={() => setGrp(g === grp ? "" : g)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  grp === g
                    ? "bg-slate-800 text-white"
                    : ending
                      ? "bg-red-100 text-red-700 border border-red-300"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {ending && <span className="h-2 w-2 rounded-full bg-red-500" />}
                {g}
                {ending && (
                  <span className="text-[10px]">
                    ({dl < 0 ? "vencido" : `${Math.ceil(dl)}d`})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading && <p className="mt-6 text-sm text-slate-500">Cargando…</p>}

      {/* ===== TURNOS ACTIVOS ===== */}
      {!loading && isRotation && (
        <>
          <h2 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            De turno ahora
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.filter(matchFilter).length === 0 && (
              <p className="text-sm text-slate-500 col-span-2">
                No hay turnos activos{grp ? ` en ${grp}` : ""}.
              </p>
            )}
            {active.filter(matchFilter).map((r) => {
              const dl = daysLeft(r.end_at!, now);
              const ending = dl <= RED_DAYS;
              return (
                <div
                  key={r.id}
                  className={`rounded-2xl border p-4 shadow-sm ${
                    ending
                      ? "border-red-300 bg-red-50"
                      : "border-emerald-200 bg-emerald-50/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-bold uppercase tracking-wide ${ending ? "text-red-700" : "text-emerald-700"}`}>
                      {r.grp || area}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        ending ? "bg-red-200 text-red-800" : "bg-emerald-200 text-emerald-800"
                      }`}
                    >
                      {dl < 0 ? "Vencido" : `termina en ${Math.max(1, Math.ceil(dl))}d`}
                    </span>
                  </div>
                  <p className="mt-1.5 text-base font-bold text-slate-800">
                    {r.person}
                  </p>
                  <ContactLinks r={r} />
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Turno: {fmtFull(r.start_at!)} → {fmtFull(r.end_at!)}
                  </p>
                  <Extras r={r} />
                </div>
              );
            })}
          </div>

          {/* ===== PRÓXIMOS TURNOS ===== */}
          <h2 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Próximos turnos
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-3 py-2 font-medium">Ciudad/Grupo</th>
                  <th className="px-3 py-2 font-medium">Turno</th>
                  <th className="px-3 py-2 font-medium">Persona</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.filter(matchFilter).slice(0, 25).map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-xs font-semibold text-slate-700">
                      {r.grp}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                      {fmt(r.start_at!)} → {fmt(r.end_at!)}
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-xs font-medium text-slate-800">{r.person}</p>
                      <p className="text-[11px] text-slate-500">{r.phone}</p>
                    </td>
                  </tr>
                ))}
                {upcoming.filter(matchFilter).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-xs text-slate-400">
                      Sin turnos programados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== DIRECTORIO (áreas sin turnos) ===== */}
      {!loading && !isRotation && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {directoryRows.length === 0 && (
            <p className="text-sm text-slate-500 col-span-2">Sin contactos.</p>
          )}
          {directoryRows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              {r.grp && (
                <p className="text-[10px] font-bold uppercase tracking-wide text-lbc">
                  {r.grp}
                </p>
              )}
              {r.person && (
                <p className="mt-0.5 text-sm font-bold text-slate-800">{r.person}</p>
              )}
              <ContactLinks r={r} />
              <Extras r={r} />
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <p className="mt-6 text-center text-xs text-slate-400">
          Eres admin: actualiza este rol en{" "}
          <a href="/admin/contactos" className="text-lbc underline">
            Administración → Contactos
          </a>
        </p>
      )}
    </div>
  );
}

function ContactLinks({ r }: { r: Contact }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {r.phone && (
        <a href={`tel:${r.phone.split("/")[0].trim()}`} className="font-semibold text-lbc hover:underline">
          📞 {r.phone}
        </a>
      )}
      {r.email && (
        <a href={`mailto:${r.email.split("/")[0].trim()}`} className="text-lbc hover:underline break-all">
          ✉️ {r.email}
        </a>
      )}
      {r.support_name && (
        <span className="text-slate-500">
          Apoyo: <strong>{r.support_name}</strong>
          {r.support_phone && ` · ${r.support_phone}`}
          {r.support_email && ` · ${r.support_email}`}
        </span>
      )}
    </div>
  );
}

function Extras({ r }: { r: Contact }) {
  const hasEsc = r.escalation?.length > 0;
  const hasExtra = r.extra?.length > 0;
  if (!hasEsc && !hasExtra) return null;
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-lbc">
        {hasEsc ? "Escalamiento y detalles" : "Detalles"}
      </summary>
      <div className="mt-1.5 space-y-1 rounded-lg bg-white/70 p-2 text-[11px]">
        {r.escalation?.map((e, i) => (
          <p key={i} className="text-slate-600">
            <span className="font-semibold">Esc. {i + 1}:</span> {e.name}
            {e.phone && ` · ${e.phone}`}
            {e.email && ` · ${e.email}`}
          </p>
        ))}
        {r.extra?.map((e, i) => (
          <p key={i} className="text-slate-600">
            <span className="font-semibold">{e.label}:</span> {e.value}
          </p>
        ))}
      </div>
    </details>
  );
}

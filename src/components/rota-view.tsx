"use client";

import { useEffect, useState, useTransition } from "react";
import {
  saveOperator,
  deleteOperator,
  saveShifts,
} from "@/app/(app)/admin/actions";

type Operator = { id: number; name: string; position: number };
type Shift = {
  id: number;
  operator_id: number;
  dow: number;
  block: number;
  start_min: number;
  end_min: number;
  is_libre: boolean;
};

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const minToStr = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const strToMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** dow 0=lunes..6=domingo ; turnos con fin<=inicio cruzan medianoche */
function isOnShift(s: Shift, dow: number, min: number) {
  if (s.dow !== dow || s.is_libre) return false;
  if (s.start_min < s.end_min) return min >= s.start_min && min < s.end_min;
  return min >= s.start_min || min < s.end_min;
}

export function RotaView({
  operators,
  shifts,
  isAdmin,
}: {
  operators: Operator[];
  shifts: Shift[];
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<number | null>(
    operators[0]?.id ?? null
  );
  const [editMode, setEditMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [editName, setEditName] = useState("");
  const [week, setWeek] = useState<
    {
      libre: boolean;
      t1s: string;
      t1e: string;
      hasT2: boolean;
      t2s: string;
      t2e: string;
    }[]
  >([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);
  const [nowDow, setNowDow] = useState(0);

  // Reloj en vivo: actualiza cada 30s quiénes deben estar en turno
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNowDow((d.getDay() + 6) % 7);
      setNowMin(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const online =
    nowMin === null
      ? []
      : operators.filter((op) =>
          shifts.some((s) => s.operator_id === op.id && isOnShift(s, nowDow, nowMin))
        );

  const dayRows = (opId: number, dow: number) =>
    shifts
      .filter((s) => s.operator_id === opId && s.dow === dow)
      .sort((a, b) => a.block - b.block);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  }

  const selOp = operators.find((o) => o.id === selected);

  function startEdit() {
    if (!selOp) return;
    setEditName(selOp.name);
    setWeek(
      DAYS.map((_, dow) => {
        const dayRows = shifts
          .filter((s) => s.operator_id === selOp.id && s.dow === dow)
          .sort((a, b) => a.block - b.block);
        const b1 = dayRows.find((r) => r.block === 1);
        const b2 = dayRows.find((r) => r.block === 2);
        return {
          libre: dayRows.some((r) => r.is_libre),
          t1s: b1 ? minToStr(b1.start_min) : "08:00",
          t1e: b1 ? minToStr(b1.end_min) : "13:00",
          hasT2: !!b2,
          t2s: b2 ? minToStr(b2.start_min) : "14:30",
          t2e: b2 ? minToStr(b2.end_min) : "18:30",
        };
      })
    );
    setEditMode(true);
    setErr(null);
  }

  function onAddOperator() {
    if (!newName.trim()) return setErr("Escribe el nombre del operador.");
    setErr(null);
    startTransition(async () => {
      const res = await saveOperator({
        name: newName,
        position: operators.length,
      });
      if (!res.ok) return setErr(res.error);
      setNewName("");
      if (res.id) setSelected(res.id);
      flash("Operador agregado. Ahora define su horario.");
      setEditMode(true);
    });
  }

  function onSaveWeek() {
    if (!selOp) return;
    setErr(null);
    startTransition(async () => {
      if (editName.trim() && editName.trim() !== selOp.name) {
        const r = await saveOperator({ id: selOp.id, name: editName, position: selOp.position });
        if (!r.ok) return setErr(r.error);
      }
      const res = await saveShifts(
        selOp.id,
        week.flatMap((d, dow) => {
          if (d.libre)
            return [
              { dow, block: 1, start_min: 0, end_min: 0, is_libre: true },
            ];
          const rows = [
            {
              dow,
              block: 1,
              start_min: strToMin(d.t1s || "0:0"),
              end_min: strToMin(d.t1e || "0:0"),
              is_libre: false,
            },
          ];
          if (d.hasT2)
            rows.push({
              dow,
              block: 2,
              start_min: strToMin(d.t2s || "0:0"),
              end_min: strToMin(d.t2e || "0:0"),
              is_libre: false,
            });
          return rows;
        })
      );
      if (!res.ok) return setErr(res.error);
      setEditMode(false);
      flash("Horario guardado.");
    });
  }

  return (
    <div>
      {/* Contador en vivo */}
      <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <p className="text-sm font-bold tracking-wide text-emerald-800">
            {nowMin === null ? "…" : online.length}{" "}
            <span className="font-semibold">AGENTES EN LISTO</span>
          </p>
        </div>
        {online.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
            {online.map((o) => (
              <span
                key={o.id}
                className="rounded-full bg-emerald-100/60 px-2.5 py-0.5 text-xs font-medium text-emerald-600/80"
              >
                {o.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {err && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>
      )}
      {msg && (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>
      )}

      {/* Lista de operadores */}
      <div className="flex flex-wrap gap-1.5">
        {operators.map((o) => (
          <button
            key={o.id}
            onClick={() => {
              setSelected(o.id);
              setEditMode(false);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              o.id === selected
                ? "bg-lbc text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-lbc hover:text-lbc"
            }`}
          >
            {o.name}
            {online.some((x) => x.id === o.id) && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        ))}
        {operators.length === 0 && (
          <p className="text-sm text-slate-400">Aún no hay operadores.</p>
        )}
      </div>

      {isAdmin && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del operador"
            className="w-52 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-lbc"
          />
          <button
            onClick={onAddOperator}
            disabled={pending}
            className="rounded-lg bg-lbc px-3 py-1.5 text-xs font-semibold text-white hover:bg-lbc-dark disabled:opacity-60"
          >
            + Agregar operador
          </button>
          {selOp && !editMode && (
            <>
              <button
                onClick={startEdit}
                className="rounded-lg border border-lbc px-3 py-1.5 text-xs font-semibold text-lbc hover:bg-lbc/10"
              >
                Editar horario
              </button>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar a ${selOp.name} y su horario?`))
                    startTransition(async () => {
                      const res = await deleteOperator(selOp.id);
                      if (!res.ok) return setErr(res.error);
                      setSelected(null);
                      flash("Operador eliminado.");
                    });
                }}
                disabled={pending}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      )}

      {/* Semana del operador seleccionado */}
      {selOp && !editMode && (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium">Día</th>
                <th className="px-4 py-2.5 font-medium">Horario de {selOp.name}</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map((_, dow) => {
                const rows = dayRows(selOp.id, dow);
                const today = dow === nowDow;
                const active =
                  nowMin !== null && rows.some((s) => isOnShift(s, nowDow, nowMin));
                return (
                  <tr
                    key={dow}
                    className={`border-b border-slate-100 last:border-0 ${today ? "bg-lbc/5" : ""}`}
                  >
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-700">
                      {DAYS[dow]}
                      {today && (
                        <span className="ml-2 rounded-full bg-lbc px-1.5 py-0.5 text-[9px] font-bold text-white">
                          HOY
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {rows.length === 0 ? (
                        <span className="text-slate-400">Sin horario</span>
                      ) : rows[0].is_libre ? (
                        <span className="font-semibold text-amber-600">Libre</span>
                      ) : (
                        rows
                          .filter((r) => !r.is_libre)
                          .map(
                            (r) => `${minToStr(r.start_min)} – ${minToStr(r.end_min)}`
                          )
                          .join("  ·  ")
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {today && active && (
                        <span className="font-semibold text-emerald-600">● En turno</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edición del horario semanal */}
      {selOp && editMode && (
        <div className="mt-5 rounded-2xl border border-lbc/40 bg-white p-5 shadow-sm">
          <label className="text-xs font-medium text-slate-500">
            Nombre del operador
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1 block w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
            />
          </label>
          <div className="mt-4 grid gap-2">
            {DAYS.map((d, dow) => (
              <div
                key={dow}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
              >
                <span className="w-24 text-xs font-semibold text-slate-700">{d}</span>
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={week[dow]?.libre ?? false}
                    onChange={(e) =>
                      setWeek(
                        week.map((w, i) =>
                          i === dow ? { ...w, libre: e.target.checked } : w
                        )
                      )
                    }
                    className="h-4 w-4 rounded accent-amber-500"
                  />
                  Libre
                </label>
                {!week[dow]?.libre && (
                  <>
                    <span className="text-[10px] font-semibold text-slate-400">
                      T1
                    </span>
                    <input
                      type="time"
                      value={week[dow]?.t1s ?? "08:00"}
                      onChange={(e) =>
                        setWeek(
                          week.map((w, i) =>
                            i === dow ? { ...w, t1s: e.target.value } : w
                          )
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-lbc"
                    />
                    <span className="text-xs text-slate-400">a</span>
                    <input
                      type="time"
                      value={week[dow]?.t1e ?? "13:00"}
                      onChange={(e) =>
                        setWeek(
                          week.map((w, i) =>
                            i === dow ? { ...w, t1e: e.target.value } : w
                          )
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-lbc"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={week[dow]?.hasT2 ?? false}
                        onChange={(e) =>
                          setWeek(
                            week.map((w, i) =>
                              i === dow ? { ...w, hasT2: e.target.checked } : w
                            )
                          )
                        }
                        className="h-4 w-4 rounded accent-lbc"
                      />
                      2º turno
                    </label>
                    {week[dow]?.hasT2 && (
                      <>
                        <span className="text-[10px] font-semibold text-slate-400">
                          T2
                        </span>
                        <input
                          type="time"
                          value={week[dow]?.t2s ?? "14:30"}
                          onChange={(e) =>
                            setWeek(
                              week.map((w, i) =>
                                i === dow ? { ...w, t2s: e.target.value } : w
                              )
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-lbc"
                        />
                        <span className="text-xs text-slate-400">a</span>
                        <input
                          type="time"
                          value={week[dow]?.t2e ?? "18:30"}
                          onChange={(e) =>
                            setWeek(
                              week.map((w, i) =>
                                i === dow ? { ...w, t2e: e.target.value } : w
                              )
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-lbc"
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={onSaveWeek}
              disabled={pending}
              className="rounded-lg bg-lbc px-4 py-2 text-sm font-semibold text-white hover:bg-lbc-dark disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar horario"}
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

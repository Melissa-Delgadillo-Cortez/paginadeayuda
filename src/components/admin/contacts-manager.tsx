"use client";

import { useState, useTransition } from "react";
import {
  saveContact,
  deleteContact,
  incidentReassign,
} from "@/app/(app)/admin/actions";
import type { Contact } from "@/components/contacts-view";

const toLocalInput = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";
const fromLocalInput = (v: string) =>
  v ? new Date(v).toISOString() : null;

const escToText = (e: Contact["escalation"]) =>
  (e ?? []).map((x) => `${x.name} | ${x.phone} | ${x.email}`).join("\n");
const textToEsc = (t: string) =>
  t.split("\n").map((l) => {
    const [name = "", phone = "", email = ""] = l.split("|").map((s) => s.trim());
    return { name, phone, email };
  }).filter((e) => e.name || e.phone || e.email);

export function ContactsManager({
  rows,
  now,
}: {
  rows: Contact[];
  now: number;
}) {
  const [pending, startTransition] = useTransition();
  const [area, setArea] = useState("");
  const [editing, setEditing] = useState<Partial<Contact> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const rotationAreas = [
    ...new Set(rows.filter((r) => r.end_at).map((r) => r.area)),
  ];
  const [dutyArea, setDutyArea] = useState(rotationAreas[0] ?? "");
  const [dutyGrp, setDutyGrp] = useState("");
  const [dutyPerson, setDutyPerson] = useState("");
  const [dutyNew, setDutyNew] = useState("");
  const [dutyStart, setDutyStart] = useState("");
  const [dutyEnd, setDutyEnd] = useState("");
  const [dutyType, setDutyType] = useState<"principal" | "apoyo">("principal");
  const [incOpen, setIncOpen] = useState(false);
  const [incPerson, setIncPerson] = useState("");
  const [incNew, setIncNew] = useState("");
  const [incReason, setIncReason] = useState("");

  const areas = [...new Set(rows.map((r) => r.area))].sort();
  const visible = rows.filter((r) => !area || r.area === area);

  const dutyGrps = [
    ...new Set(
      rows.filter((r) => r.area === dutyArea && r.end_at).map((r) => r.grp)
    ),
  ].sort();
  const dutyPersons = [
    ...new Map(
      rows
        .filter((r) => r.area === dutyArea && r.grp === dutyGrp && r.person)
        .map((r) => [r.person, r])
    ).values(),
  ];
  const currentDuty = rows.filter(
    (r) =>
      r.area === dutyArea &&
      r.grp === dutyGrp &&
      r.start_at &&
      new Date(r.start_at).getTime() <= now &&
      r.end_at &&
      new Date(r.end_at).getTime() >= now
  );

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  }

  function onSave() {
    if (!editing) return;
    setErr(null);
    startTransition(async () => {
      const res = await saveContact({
        id: editing.id,
        area: editing.area!,
        grp: editing.grp ?? "",
        person: editing.person ?? "",
        phone: editing.phone ?? "",
        email: editing.email ?? "",
        support_name: editing.support_name ?? "",
        support_phone: editing.support_phone ?? "",
        support_email: editing.support_email ?? "",
        escalation: editing.escalation ?? [],
        start_at: editing.start_at ?? null,
        end_at: editing.end_at ?? null,
        extra: editing.extra ?? [],
        position: editing.position ?? 0,
      });
      if (!res.ok) return setErr(res.error);
      setEditing(null);
      flash("Contacto guardado.");
    });
  }

  function onDelete(r: Contact) {
    if (!confirm(`¿Eliminar a ${r.person || r.grp}?`)) return;
    setErr(null);
    startTransition(async () => {
      const res = await deleteContact(r.id);
      if (!res.ok) return setErr(res.error);
      flash("Contacto eliminado.");
    });
  }

  function onAssignDuty() {
    if (!dutyGrp) return setErr("Selecciona la ciudad/grupo.");
    if (!dutyPerson && !dutyNew) return setErr("Selecciona o escribe la persona de turno.");
    if (!dutyEnd) return setErr("Indica hasta cuándo dura el turno.");
    setErr(null);
    const person = dutyPerson === "__new__" ? dutyNew.trim() : dutyPerson;
    const prev = dutyPersons.find((r) => r.person === person);
    const maxPos = Math.max(
      0,
      ...rows.filter((r) => r.area === dutyArea).map((r) => r.position)
    );
    startTransition(async () => {
      const res = await saveContact({
        area: dutyArea,
        grp: dutyGrp,
        person,
        phone: prev?.phone ?? "",
        email: prev?.email ?? "",
        start_at: dutyStart
          ? new Date(dutyStart).toISOString()
          : new Date().toISOString(),
        end_at: new Date(dutyEnd).toISOString(),
        duty_type: dutyType,
        position: maxPos + 1,
      });
      if (!res.ok) return setErr(res.error);
      setDutyPerson("");
      setDutyNew("");
      setDutyStart("");
      setDutyEnd("");
      setDutyType("principal");
      flash(`${person} quedó de turno en ${dutyGrp} hasta ${new Date(dutyEnd).toLocaleDateString("es-BO")}.`);
    });
  }

  function onIncident() {
    const person = incPerson === "__new__" ? incNew.trim() : incPerson;
    if (!person) return setErr("Selecciona o escribe el reemplazo.");
    if (!incReason.trim()) return setErr("Indica el motivo de la incidencia.");
    const cur = currentDuty[0];
    if (!cur) return setErr("No hay turno activo en esta ciudad.");
    setErr(null);
    const prev = dutyPersons.find((r) => r.person === person);
    startTransition(async () => {
      const res = await incidentReassign({
        id: cur.id,
        person,
        phone: prev?.phone ?? cur.phone,
        email: prev?.email ?? cur.email,
        reason: incReason,
      });
      if (!res.ok) return setErr(res.error);
      setIncOpen(false);
      setIncPerson("");
      setIncNew("");
      setIncReason("");
      flash(`Incidencia registrada: ${person} reemplaza a ${cur.person} en ${dutyGrp}.`);
    });
  }

  return (
    <div>
      {/* ===== Asignar quién está de turno ===== */}
      {rotationAreas.length > 0 && (
        <div className="mb-5 rounded-2xl border border-lbc/30 bg-lbc/5 p-5">
          <h2 className="text-sm font-bold text-slate-800">
            Asignar turno ahora
          </h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-xs font-medium text-slate-500">
              Área
              <select
                value={dutyArea}
                onChange={(e) => {
                  setDutyArea(e.target.value);
                  setDutyGrp("");
                  setDutyPerson("");
                }}
                className="mt-1 block w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
              >
                {rotationAreas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-500">
              Ciudad/Grupo
              <select
                value={dutyGrp}
                onChange={(e) => {
                  setDutyGrp(e.target.value);
                  setDutyPerson("");
                }}
                className="mt-1 block w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
              >
                <option value="">Seleccionar…</option>
                {dutyGrps.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-500">
              Persona de turno
              <select
                value={dutyPerson}
                onChange={(e) => setDutyPerson(e.target.value)}
                className="mt-1 block w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
              >
                <option value="">Seleccionar…</option>
                {dutyPersons.map((r) => (
                  <option key={r.id} value={r.person}>
                    {r.person}
                  </option>
                ))}
                <option value="__new__">— Otra persona —</option>
              </select>
            </label>
            {dutyPerson === "__new__" && (
              <label className="text-xs font-medium text-slate-500">
                Nombre
                <input
                  value={dutyNew}
                  onChange={(e) => setDutyNew(e.target.value)}
                  placeholder="Nombre completo"
                  className="mt-1 block w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
                />
              </label>
            )}
            <label className="text-xs font-medium text-slate-500">
              Tipo
              <select
                value={dutyType}
                onChange={(e) =>
                  setDutyType(e.target.value as "principal" | "apoyo")
                }
                className="mt-1 block w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
              >
                <option value="principal">Principal</option>
                <option value="apoyo">Ejecutivo de apoyo</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-500">
              Desde (vacío = ahora)
              <input
                type="datetime-local"
                value={dutyStart}
                onChange={(e) => setDutyStart(e.target.value)}
                className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Turno hasta
              <input
                type="datetime-local"
                value={dutyEnd}
                onChange={(e) => setDutyEnd(e.target.value)}
                className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
              />
            </label>
            <button
              onClick={onAssignDuty}
              disabled={pending}
              className="rounded-lg bg-lbc px-4 py-2 text-sm font-semibold text-white hover:bg-lbc-dark disabled:opacity-60"
            >
              {pending ? "Asignando…" : "Asignar de turno"}
            </button>
          </div>
          {dutyGrp && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-xs text-slate-500">
                {currentDuty.length > 0
                  ? `De turno ahora en ${dutyGrp}: ${currentDuty
                      .map(
                        (r) =>
                          `${r.person}${r.duty_type === "apoyo" ? " (apoyo)" : ""}`
                      )
                      .join(", ")}`
                  : `Nadie de turno ahora en ${dutyGrp}.`}
              </p>
              {currentDuty.length > 0 && (
                <button
                  onClick={() => setIncOpen(!incOpen)}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                >
                  ⚠ Incidencia / reasignar
                </button>
              )}
            </div>
          )}

          {incOpen && currentDuty.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50/60 p-4">
              <p className="text-xs font-semibold text-amber-800">
                Reasignar turno de {currentDuty[0].person} en {dutyGrp} — su
                turno termina ahora y el reemplazo cubre hasta{" "}
                {new Date(currentDuty[0].end_at!).toLocaleString("es-BO")}.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="text-xs font-medium text-slate-500">
                  Reemplazo
                  <select
                    value={incPerson}
                    onChange={(e) => setIncPerson(e.target.value)}
                    className="mt-1 block w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
                  >
                    <option value="">Seleccionar…</option>
                    {dutyPersons.map((r) => (
                      <option key={r.id} value={r.person}>
                        {r.person}
                      </option>
                    ))}
                    <option value="__new__">— Otra persona —</option>
                  </select>
                </label>
                {incPerson === "__new__" && (
                  <label className="text-xs font-medium text-slate-500">
                    Nombre
                    <input
                      value={incNew}
                      onChange={(e) => setIncNew(e.target.value)}
                      placeholder="Nombre completo"
                      className="mt-1 block w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
                    />
                  </label>
                )}
                <label className="text-xs font-medium text-slate-500">
                  Motivo
                  <input
                    value={incReason}
                    onChange={(e) => setIncReason(e.target.value)}
                    placeholder="Vacaciones, enfermedad, incidencia…"
                    className="mt-1 block w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
                  />
                </label>
                <button
                  onClick={onIncident}
                  disabled={pending}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {pending ? "Reasignando…" : "Confirmar reasignación"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
        >
          <option value="">Todas las áreas ({rows.length})</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a} ({rows.filter((r) => r.area === a).length})
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            setEditing({
              area: area || "AUTOMOTORES",
              grp: "",
              person: "",
              phone: "",
              email: "",
              escalation: [],
              extra: [],
            })
          }
          className="rounded-lg bg-lbc px-4 py-2 text-sm font-semibold text-white hover:bg-lbc-dark"
        >
          + Nuevo contacto
        </button>
      </div>

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

      {editing && (
        <div className="mb-5 rounded-2xl border border-lbc/40 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">
            {editing.id ? "Editar contacto" : "Nuevo contacto"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium text-slate-500">
              Área
              <input
                value={editing.area ?? ""}
                onChange={(e) => setEditing({ ...editing, area: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Ciudad/Grupo
              <input
                value={editing.grp ?? ""}
                onChange={(e) => setEditing({ ...editing, grp: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Persona
              <input
                value={editing.person ?? ""}
                onChange={(e) => setEditing({ ...editing, person: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Teléfono
              <input
                value={editing.phone ?? ""}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Correo
              <input
                value={editing.email ?? ""}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
              />
            </label>
            {editing.id && (
              <>
                <label className="text-xs font-medium text-slate-500">
                  Ejecutivo de apoyo
                  <input
                    value={editing.support_name ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, support_name: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
                  />
                </label>
                <label className="text-xs font-medium text-slate-500">
                  Tel. apoyo
                  <input
                    value={editing.support_phone ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, support_phone: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
                  />
                </label>
                <label className="text-xs font-medium text-slate-500">
                  Tipo de turno
                  <select
                    value={editing.duty_type ?? "principal"}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        duty_type: e.target.value as "principal" | "apoyo",
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lbc"
                  >
                    <option value="principal">Principal</option>
                    <option value="apoyo">Ejecutivo de apoyo</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-500">
                  Inicio turno
                  <input
                    type="datetime-local"
                    value={toLocalInput(editing.start_at ?? null)}
                    onChange={(e) =>
                      setEditing({ ...editing, start_at: fromLocalInput(e.target.value) })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
                  />
                </label>
                <label className="text-xs font-medium text-slate-500">
                  Fin turno
                  <input
                    type="datetime-local"
                    value={toLocalInput(editing.end_at ?? null)}
                    onChange={(e) =>
                      setEditing({ ...editing, end_at: fromLocalInput(e.target.value) })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
                  />
                </label>
              </>
            )}
          </div>
          <label className="mt-3 block text-xs font-medium text-slate-500">
            Escalamientos (uno por línea: Nombre | teléfono | correo)
            <textarea
              rows={3}
              value={escToText(editing.escalation ?? [])}
              onChange={(e) =>
                setEditing({ ...editing, escalation: textToEsc(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-lbc"
            />
          </label>
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

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
              <th className="px-3 py-2.5 font-medium">Área / Ciudad</th>
              <th className="px-3 py-2.5 font-medium">Persona</th>
              <th className="px-3 py-2.5 font-medium">Contacto</th>
              <th className="px-3 py-2.5 font-medium">Turno</th>
              <th className="px-3 py-2.5 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, 300).map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2.5">
                  <p className="text-xs font-semibold text-lbc">{r.area}</p>
                  <p className="text-xs text-slate-500">{r.grp}</p>
                </td>
                <td className="px-3 py-2.5 text-xs font-medium text-slate-800">
                  {r.person || "—"}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-500">
                  {r.phone}
                  {r.email && <><br />{r.email}</>}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                  {r.start_at
                    ? `${new Date(r.start_at).toLocaleDateString("es-BO")} → ${new Date(r.end_at!).toLocaleDateString("es-BO")}`
                    : "—"}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <button
                    onClick={() => setEditing({ ...r })}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-lbc hover:bg-lbc/10"
                  >
                    Editar
                  </button>{" "}
                  <button
                    onClick={() => onDelete(r)}
                    disabled={pending}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length > 300 && (
          <p className="px-3 py-2 text-center text-xs text-slate-400">
            Mostrando 300 de {visible.length} — filtra por área
          </p>
        )}
      </div>
    </div>
  );
}

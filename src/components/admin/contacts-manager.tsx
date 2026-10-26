"use client";

import { useRef, useState, useTransition } from "react";
import { saveContact, deleteContact, importContacts } from "@/app/(app)/admin/actions";
import { parseWorkbook } from "@/lib/parse-rol.mjs";
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

export function ContactsManager({ rows }: { rows: Contact[] }) {
  const [pending, startTransition] = useTransition();
  const [area, setArea] = useState("");
  const [editing, setEditing] = useState<Partial<Contact> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const areas = [...new Set(rows.map((r) => r.area))].sort();
  const visible = rows.filter((r) => !area || r.area === area);

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

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    try {
      const XLSX = (await import("xlsx")).default;
      const wb = XLSX.read(await file.arrayBuffer());
      const sheets = wb.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json(wb.Sheets[name], {
          header: 1,
          defval: "",
        }),
      }));
      const { contacts, areas: importedAreas, warnings } = parseWorkbook(
        sheets as { name: string; rows: unknown[][] }[]
      ) as { contacts: import("@/app/(app)/admin/actions").ContactInput[]; areas: string[]; warnings: string[] };
      if (
        !confirm(
          `Se importarán ${contacts.length} contactos en ${importedAreas.length} áreas, REEMPLAZANDO todo el rol actual.\n\n${warnings.join("\n")}\n\n¿Continuar?`
        )
      )
        return;
      startTransition(async () => {
        const res = await importContacts(contacts);
        if (!res.ok) return setErr(res.error);
        flash(`Importados ${contacts.length} contactos.`);
      });
    } catch {
      setErr("No se pudo leer el archivo. Debe ser .xlsx");
    }
  }

  return (
    <div>
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
        <button
          onClick={() => fileRef.current?.click()}
          disabled={pending}
          className="rounded-lg border border-lbc px-4 py-2 text-sm font-semibold text-lbc hover:bg-lbc/10 disabled:opacity-50"
        >
          ⬆ Importar Excel
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onImportFile}
        />
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
              Inicio turno (opcional)
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
              Fin turno (opcional)
              <input
                type="datetime-local"
                value={toLocalInput(editing.end_at ?? null)}
                onChange={(e) =>
                  setEditing({ ...editing, end_at: fromLocalInput(e.target.value) })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
              />
            </label>
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

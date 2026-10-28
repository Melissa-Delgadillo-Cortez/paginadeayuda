import { createClient } from "@/lib/supabase/server";

const LABELS: Record<string, { label: string; cls: string }> = {
  login: { label: "Ingreso", cls: "bg-sky-100 text-sky-700" },
  article_create: { label: "Artículo creado", cls: "bg-emerald-100 text-emerald-700" },
  article_update: { label: "Artículo editado", cls: "bg-emerald-50 text-emerald-600" },
  article_delete: { label: "Artículo eliminado", cls: "bg-red-100 text-red-700" },
  contact_create: { label: "Contacto creado", cls: "bg-slate-100 text-slate-600" },
  contact_update: { label: "Contacto editado", cls: "bg-slate-100 text-slate-600" },
  contact_delete: { label: "Contacto eliminado", cls: "bg-slate-100 text-slate-600" },
  incident: { label: "Incidencia", cls: "bg-amber-100 text-amber-700" },
  link_create: { label: "Enlace creado", cls: "bg-slate-100 text-slate-600" },
  link_update: { label: "Enlace editado", cls: "bg-slate-100 text-slate-600" },
  link_delete: { label: "Enlace eliminado", cls: "bg-slate-100 text-slate-600" },
  operator_create: { label: "Operador creado", cls: "bg-slate-100 text-slate-600" },
  operator_update: { label: "Operador editado", cls: "bg-slate-100 text-slate-600" },
  operator_delete: { label: "Operador eliminado", cls: "bg-slate-100 text-slate-600" },
  shifts_update: { label: "Horario editado", cls: "bg-slate-100 text-slate-600" },
};

export default async function BitacoraPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800">Bitácora</h1>
      <p className="mt-1 text-sm text-slate-500">
        Últimos {events?.length ?? 0} eventos: ingresos y cambios realizados.
      </p>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
              <th className="px-4 py-2.5 font-medium">Fecha y hora</th>
              <th className="px-4 py-2.5 font-medium">Usuario</th>
              <th className="px-4 py-2.5 font-medium">Evento</th>
              <th className="px-4 py-2.5 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((e) => {
              const meta = LABELS[e.event] ?? {
                label: e.event,
                cls: "bg-slate-100 text-slate-600",
              };
              return (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString("es-BO")}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-700">{e.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{e.detail}</td>
                </tr>
              );
            })}
            {(events ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400">
                  Sin eventos registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

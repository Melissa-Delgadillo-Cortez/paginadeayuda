import { createClient } from "@/lib/supabase/server";
import { ContactsManager } from "@/components/admin/contacts-manager";
import { ContactosImport } from "@/components/contactos-import";

export default async function AdminContactsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("contacts")
    .select("*")
    .order("position");

  const areas = [...new Set((rows ?? []).map((r) => r.area).filter(Boolean))];
  const grps: Record<string, string[]> = {};
  for (const r of rows ?? []) {
    if (!r.area || !r.grp) continue;
    (grps[r.area] ??= []);
    if (!grps[r.area].includes(r.grp)) grps[r.area].push(r.grp);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800">
        Contactos de emergencia
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Edita contactos o asigna directamente quién está de turno por ciudad.
      </p>
      <div className="mt-5">
        <ContactosImport areas={areas} grps={grps} />
        {/* eslint-disable-next-line react-hooks/purity -- server component: se evalúa una vez por request */}
        <ContactsManager rows={rows ?? []} now={Date.now()} />
      </div>
    </div>
  );
}

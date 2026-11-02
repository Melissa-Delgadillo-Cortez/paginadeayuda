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

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800">
        Contactos de emergencia
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Edita contactos o asigna directamente quién está de turno por ciudad.
      </p>
      <div className="mt-5">
        <ContactosImport areas={areas} />
        {/* eslint-disable-next-line react-hooks/purity -- server component: se evalúa una vez por request */}
        <ContactsManager rows={rows ?? []} now={Date.now()} />
      </div>
    </div>
  );
}

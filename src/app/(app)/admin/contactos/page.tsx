import { createClient } from "@/lib/supabase/server";
import { ContactsManager } from "@/components/admin/contacts-manager";

export default async function AdminContactsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("contacts")
    .select("*")
    .order("position");

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800">
        Contactos de emergencia
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Edita contactos o reimporta el rol completo desde un Excel actualizado.
      </p>
      <div className="mt-5">
        <ContactsManager rows={rows ?? []} />
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { ContactsView } from "@/components/contacts-view";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase.from("contacts").select("area").order("area"),
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
  ]);

  // Áreas con turnos primero, luego alfabético
  const rotationAreas = ["AUTOMOTORES", "GENERALES", "PERSONALES_VIDA"];
  const areas = [...new Set((rows ?? []).map((r) => r.area))].sort((a, b) => {
    const ra = rotationAreas.indexOf(a), rb = rotationAreas.indexOf(b);
    if (ra !== -1 || rb !== -1)
      return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
    return a.localeCompare(b, "es");
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800">
        Contactos de emergencia
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Roles de turno por área y ciudad. En rojo: turnos que vencen en 3 días o
        menos.
      </p>
      <div className="mt-5">
        <ContactsView
          areas={areas}
          isAdmin={profile?.role === "admin"}
          // eslint-disable-next-line react-hooks/purity -- server component: se evalúa una vez por request
          now={Date.now()}
        />
      </div>
    </div>
  );
}

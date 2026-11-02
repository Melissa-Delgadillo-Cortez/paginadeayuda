import { createClient } from "@/lib/supabase/server";
import { AvisosView } from "@/components/avisos-view";

export default async function AvisosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase.from("avisos").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800">Avisos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ejecutivos ausentes o de vacaciones.
      </p>
      <div className="mt-5">
        <AvisosView rows={rows ?? []} isAdmin={profile?.role === "admin"} />
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { PendientesView } from "@/components/pendientes-view";

export default async function PendientesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("pendientes")
      .select("*")
      .order("done")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800">Pendientes</h1>
      <p className="mt-1 text-sm text-slate-500">
        Casos que necesitan seguimiento. En rojo: pendientes sin gestionar.
      </p>
      <div className="mt-5">
        <PendientesView
          rows={rows ?? []}
          isAdmin={profile?.role === "admin"}
        />
      </div>
    </div>
  );
}

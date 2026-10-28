import { createClient } from "@/lib/supabase/server";
import { RotaView } from "@/components/rota-view";

export default async function RotaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: operators }, { data: shifts }, { data: profile }] =
    await Promise.all([
      supabase.from("operators").select("*").order("position").order("name"),
      supabase.from("operator_shifts").select("*"),
      supabase.from("profiles").select("role").eq("id", user!.id).single(),
    ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800">ROTA</h1>
      <p className="mt-1 text-sm text-slate-500">
        Horario semanal de operadores (lunes a domingo).
      </p>
      <div className="mt-5">
        <RotaView
          operators={operators ?? []}
          shifts={shifts ?? []}
          isAdmin={profile?.role === "admin"}
        />
      </div>
    </div>
  );
}

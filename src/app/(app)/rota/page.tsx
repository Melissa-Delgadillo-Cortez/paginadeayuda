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
      <h1 className="flex items-center gap-2.5 text-2xl font-bold text-slate-800">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lbc/10 text-lbc">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
            <path d="M12 14v3l2 1" />
          </svg>
        </span>
        ROTA
      </h1>
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

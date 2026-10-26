import { createClient } from "@/lib/supabase/server";
import { UsersManager } from "@/components/admin/users-manager";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
      <p className="mt-1 text-sm text-slate-500">
        Crea cuentas, cambia roles y restablece contraseñas.
      </p>
      <div className="mt-6">
        <UsersManager
          users={profiles ?? []}
          currentUserId={user!.id}
        />
      </div>
    </div>
  );
}

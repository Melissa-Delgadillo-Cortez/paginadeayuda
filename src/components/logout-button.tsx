"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logLogout } from "@/app/(app)/admin/actions";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    try {
      await logLogout(); // bitácora antes de cerrar la sesión
    } catch {
      /* ignore */
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
    >
      Cerrar sesión
    </button>
  );
}

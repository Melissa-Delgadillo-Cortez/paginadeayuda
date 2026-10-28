import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { SidebarNav } from "@/components/sidebar-nav";
import { SearchModal } from "@/components/search-modal";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: articles }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .single(),
    supabase.from("articles").select("id, title").order("position"),
  ]);

  const isAdmin = profile?.role === "admin";

  // Recordatorio de actividad (Supabase pausa tras ~7 días sin uso)
  let daysIdle: number | null = null;
  if (isAdmin) {
    const { data: last } = await supabase
      .from("audit_log")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) {
      const now = Date.now(); // eslint-disable-line react-hooks/purity -- server component
      daysIdle = Math.floor(
        (now - new Date(last.created_at).getTime()) / 86400000
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Logo size={34} />
            <span className="font-bold text-slate-800 hidden sm:inline">
              Página de Ayuda
            </span>
          </Link>
          <div className="flex-1" />
          {isAdmin && daysIdle !== null && (
            <span
              title="Días sin actividad en la página (Supabase se pausa tras ~7 días)"
              className={`hidden sm:inline rounded-full px-2 py-0.5 text-[10px] font-bold ${
                daysIdle >= 6
                  ? "bg-red-100 text-red-700"
                  : daysIdle >= 4
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {daysIdle}d
            </span>
          )}
          <SearchModal />
          <Link
            href="/contactos"
            title="Contactos de emergencia"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-lbc transition-colors"
          >
            📞 <span className="hidden sm:inline">Contactos</span>
          </Link>
          <Link
            href="/enlaces"
            title="Enlaces externos"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-lbc transition-colors"
          >
            🔗 <span className="hidden sm:inline">Enlaces</span>
          </Link>
          <Link
            href="/rota"
            title="Horarios de operadores"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-lbc transition-colors"
          >
            � <span className="hidden sm:inline">ROTA</span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-lg bg-lbc/10 px-3 py-1.5 text-xs font-semibold text-lbc hover:bg-lbc/20 transition-colors"
            >
              Administración
            </Link>
          )}
          <span className="hidden sm:inline text-xs text-slate-500 max-w-45 truncate">
            {profile?.full_name || profile?.email || user.email}
            <span
              className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isAdmin
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {isAdmin ? "Admin" : "Usuario"}
            </span>
          </span>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <aside className="hidden md:block w-64 shrink-0 border-r border-slate-200 bg-white/60">
          <SidebarNav articles={articles ?? []} isAdmin={isAdmin} />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { SidebarNav } from "@/components/sidebar-nav";

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
          <Link
            href="/"
            title="Ir a inicio / buscar"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-lbc transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            Buscar
          </Link>
          <Link
            href="/contactos"
            title="Contactos de emergencia"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-lbc transition-colors"
          >
            📞 Contactos
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

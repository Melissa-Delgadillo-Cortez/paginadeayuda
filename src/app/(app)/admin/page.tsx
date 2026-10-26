import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const [{ count: users }, { count: articles }, { count: contacts }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("articles").select("id", { count: "exact", head: true }),
      supabase.from("contacts").select("id", { count: "exact", head: true }),
    ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800">Administración</h1>
      <p className="mt-1 text-sm text-slate-500">
        Gestión de usuarios y contenido de la página de ayuda.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/usuarios"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-lbc transition-colors"
        >
          <p className="text-3xl font-bold text-lbc">{users ?? 0}</p>
          <p className="mt-1 font-semibold text-slate-800">Usuarios</p>
          <p className="mt-1 text-xs text-slate-500">
            Crear, eliminar y cambiar roles de acceso.
          </p>
        </Link>
        <Link
          href="/admin/articulos"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-lbc transition-colors"
        >
          <p className="text-3xl font-bold text-lbc">{articles ?? 0}</p>
          <p className="mt-1 font-semibold text-slate-800">Contenido</p>
          <p className="mt-1 text-xs text-slate-500">
            Crear, editar y eliminar artículos de ayuda.
          </p>
        </Link>
        <Link
          href="/admin/contactos"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-lbc transition-colors"
        >
          <p className="text-3xl font-bold text-lbc">{contacts ?? 0}</p>
          <p className="mt-1 font-semibold text-slate-800">Contactos</p>
          <p className="mt-1 text-xs text-slate-500">
            Rol de turnos de emergencia e importación desde Excel.
          </p>
        </Link>
      </div>
    </div>
  );
}

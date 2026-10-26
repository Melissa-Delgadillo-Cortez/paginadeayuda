"use client";

import { useState, useTransition } from "react";
import {
  createUser,
  deleteUser,
  setUserRole,
  resetUserPassword,
} from "@/app/(app)/admin/actions";

type User = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "user";
  created_at: string;
};

export function UsersManager({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);

  // form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [newPass, setNewPass] = useState("");

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createUser({ email, password, fullName, role });
      if (!res.ok) return setError(res.error);
      setShowForm(false);
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("user");
      flash("Usuario creado correctamente.");
    });
  }

  function onDelete(u: User) {
    if (!confirm(`¿Eliminar a ${u.email}? Esta acción no se puede deshacer.`))
      return;
    setError(null);
    startTransition(async () => {
      const res = await deleteUser(u.id);
      if (!res.ok) return setError(res.error);
      flash("Usuario eliminado.");
    });
  }

  function onRole(u: User, role: "admin" | "user") {
    setError(null);
    startTransition(async () => {
      const res = await setUserRole(u.id, role);
      if (!res.ok) return setError(res.error);
      flash("Rol actualizado.");
    });
  }

  function onReset(u: User) {
    setError(null);
    startTransition(async () => {
      const res = await resetUserPassword(u.id, newPass);
      if (!res.ok) return setError(res.error);
      setResetId(null);
      setNewPass("");
      flash("Contraseña restablecida.");
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{users.length} usuarios</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-lbc px-4 py-2 text-sm font-semibold text-white hover:bg-lbc-dark transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nuevo usuario"}
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={onCreate}
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-3 font-semibold text-slate-800">Nuevo usuario</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              required
              placeholder="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
            />
            <input
              type="email"
              required
              placeholder="correo@lbc.bo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
            />
            <input
              type="text"
              required
              minLength={10}
              placeholder="Contraseña temporal (mín. 10 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "user")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-lbc bg-white"
            >
              <option value="user">Usuario (solo lectura)</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-4 rounded-lg bg-lbc px-4 py-2 text-sm font-semibold text-white hover:bg-lbc-dark disabled:opacity-60 transition-colors"
          >
            {pending ? "Creando…" : "Crear usuario"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">
                    {u.full_name || "—"}
                    {u.id === currentUserId && (
                      <span className="ml-2 text-[10px] text-slate-400">
                        (tú)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    disabled={pending || u.id === currentUserId}
                    onChange={(e) =>
                      onRole(u, e.target.value as "admin" | "user")
                    }
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-50"
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  {resetId === u.id ? (
                    <span className="inline-flex items-center gap-2">
                      <input
                        type="text"
                        minLength={10}
                        placeholder="Nueva contraseña"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        className="w-36 rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-lbc"
                      />
                      <button
                        onClick={() => onReset(u)}
                        disabled={pending || newPass.length < 10}
                        className="rounded-md bg-lbc px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setResetId(null)}
                        className="text-xs text-slate-500"
                      >
                        ✕
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex gap-2">
                      <button
                        onClick={() => setResetId(u.id)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Contraseña
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => onDelete(u)}
                          disabled={pending}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";

/** Modal rojo con pendientes sin gestionar; se cierra por sesión (recuerda el último id visto). */
export function PendienteAlert({
  items,
}: {
  items: { id: number; title: string }[];
}) {
  const [seen, setSeen] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(sessionStorage.getItem("pend_seen") ?? 0);
  });
  const [open, setOpen] = useState(true);

  const maxId = Math.max(0, ...items.map((i) => i.id));
  const nuevos = items.filter((i) => i.id > seen);
  if (nuevos.length === 0 || !open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border-2 border-red-500 bg-white shadow-2xl">
        <div className="rounded-t-2xl bg-red-600 px-5 py-3">
          <p className="text-sm font-bold text-white">
            ⚠ {nuevos.length} pendiente{nuevos.length === 1 ? "" : "s"} sin gestionar
          </p>
        </div>
        <ul className="max-h-60 space-y-1.5 overflow-y-auto p-4">
          {nuevos.map((i) => (
            <li
              key={i.id}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
            >
              ⚠ {i.title}
            </li>
          ))}
        </ul>
        <div className="flex gap-2 border-t border-slate-100 p-4">
          <Link
            href="/pendientes"
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-red-700"
          >
            Ver pendientes
          </Link>
          <button
            onClick={() => {
              sessionStorage.setItem("pend_seen", String(maxId));
              setSeen(maxId);
              setOpen(false);
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

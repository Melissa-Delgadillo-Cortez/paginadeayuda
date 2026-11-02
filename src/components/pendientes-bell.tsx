"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Item = { id: number; title: string; created_by: string | null };

/**
 * Botón de Pendientes en el header + notificación flotante.
 * - Blanco cuando no hay pendientes; rojo cuando hay.
 * - Al entrar (o cada 20s) si hay pendientes NUEVOS (no creados por mí)
 *   muestra una ventana flotante arriba a la derecha.
 */
export function PendientesBell({
  initial,
  userId,
}: {
  initial: Item[];
  userId: string;
}) {
  const [items, setItems] = useState<Item[]>(initial);
  const [open, setOpen] = useState(true);
  const seenRef = useRef<number>(
    typeof window !== "undefined"
      ? Number(sessionStorage.getItem("pend_seen") ?? 0)
      : 0
  );

  // Refresco periódico: detecta pendientes nuevos aunque estés dentro
  useEffect(() => {
    const id = setInterval(async () => {
      const { data } = await createClient()
        .from("pendientes")
        .select("id, title, created_by")
        .eq("done", false);
      if (data) setItems(data);
    }, 20000);
    return () => clearInterval(id);
  }, []);

  const otros = items.filter((i) => i.created_by !== userId);
  const nuevos = otros.filter((i) => i.id > seenRef.current);
  const maxId = Math.max(0, ...items.map((i) => i.id));
  const hasPending = otros.length > 0 || items.some((i) => i.created_by === userId);

  function dismiss() {
    sessionStorage.setItem("pend_seen", String(maxId));
    seenRef.current = maxId;
    setOpen(false);
  }

  return (
    <>
      <Link
        href="/pendientes"
        title="Pendientes"
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
          hasPending
            ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-lbc"
        }`}
      >
        ⚠ <span className="hidden sm:inline">Pendientes</span>
        {hasPending && (
          <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
            {items.length}
          </span>
        )}
      </Link>

      {nuevos.length > 0 && open && (
        <div className="fixed right-4 top-16 z-50 w-80 max-w-[90vw] rounded-2xl border-2 border-red-500 bg-white shadow-2xl">
          <div className="flex items-center justify-between rounded-t-2xl bg-red-600 px-4 py-2.5">
            <p className="text-xs font-bold text-white">
              ⚠ {nuevos.length} pendiente{nuevos.length === 1 ? "" : "s"} sin gestionar
            </p>
            <button
              onClick={dismiss}
              className="text-sm font-bold text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
          <ul className="max-h-52 space-y-1.5 overflow-y-auto p-3">
            {nuevos.map((i) => (
              <li
                key={i.id}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800"
              >
                {i.title}
              </li>
            ))}
          </ul>
          <div className="flex gap-2 border-t border-slate-100 p-3">
            <Link
              href="/pendientes"
              onClick={dismiss}
              className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-red-700"
            >
              Ver pendientes
            </Link>
            <button
              onClick={dismiss}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}

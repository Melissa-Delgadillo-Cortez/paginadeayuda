import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

const SAFE_NAME = /^[\w.-]+$/;
const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/**
 * Sirve las imágenes del contenido SOLO a usuarios autenticados.
 * Las imágenes viven en /content-media (fuera de /public).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  if (!SAFE_NAME.test(name) || name.includes("..")) {
    return new NextResponse("Nombre inválido", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const ext = path.extname(name).toLowerCase();
  const type = TYPES[ext];
  if (!type) {
    return new NextResponse("Tipo no permitido", { status: 400 });
  }

  try {
    const file = await readFile(path.join(process.cwd(), "content-media", name));
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("No encontrado", { status: 404 });
  }
}

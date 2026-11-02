import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseContactosSheet } from "@/lib/parse-contactos.mjs";

/** POST multipart {file} → hojas parseadas (solo usuarios logueados; no escribe nada). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Falta archivo" }, { status: 400 });

  try {
    const XLSX = (await import("xlsx")).default ?? (await import("xlsx"));
    const wb = XLSX.read(await file.arrayBuffer());
    const sheets = wb.SheetNames.map((name) => {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], {
        header: 1,
        defval: "",
      });
      const parsed = parseContactosSheet(rows);
      return { name, rows: parsed.rows, warnings: parsed.warnings };
    }).filter((s) => s.rows.length > 0);
    return NextResponse.json({ sheets });
  } catch (e) {
    return NextResponse.json(
      { error: `No se pudo leer: ${(e as Error).message}` },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectRotaSheets, parseRotaSheet } from "@/lib/parse-rota.mjs";

/** POST FormData{file: .xlsx} → { sheets: {name, operators, warnings}[] } */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });

  try {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer());
    const sheets = wb.SheetNames.map((name) => ({
      name,
      rows: XLSX.utils.sheet_to_json(wb.Sheets[name], {
        header: 1,
        defval: "",
      }) as unknown[][],
    }));
    const valid = detectRotaSheets(sheets);
    if (valid.length === 0) {
      return NextResponse.json({
        sheets: [],
        error: "No se encontraron hojas con formato ROTA (Nombre + días).",
      });
    }
    return NextResponse.json({
      sheets: valid.map((name) => {
        const { operators, warnings } = parseRotaSheet(
          sheets.find((s) => s.name === name)!.rows
        );
        return { name, operators, warnings };
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el archivo. Debe ser .xlsx" },
      { status: 400 }
    );
  }
}

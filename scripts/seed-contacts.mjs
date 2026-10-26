/**
 * Importa el Excel "ROL DE CONTACTOS DE EMERGENCIA" a la tabla contacts.
 *
 * Uso: node scripts/seed-contacts.mjs <ruta-al-xlsx>
 * Requiere .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import pkg from "xlsx";
const XLSX = pkg.default ?? pkg;
import { parseWorkbook } from "../src/lib/parse-rol.mjs";

const xlsxPath = process.argv[2];
if (!xlsxPath || !fs.existsSync(xlsxPath)) {
  console.error("Uso: node scripts/seed-contacts.mjs <ruta-al-xlsx>");
  process.exit(1);
}

const envPath = path.join(process.cwd(), ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const wb = XLSX.readFile(xlsxPath);
const sheets = wb.SheetNames.map((name) => ({
  name,
  rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "" }),
}));

const { contacts, areas, warnings } = parseWorkbook(sheets);
console.log(`Áreas: ${areas.length} | Contactos parseados: ${contacts.length}`);
warnings.forEach((w) => console.log("  ⚠", w));

const { error: delErr } = await supabase.from("contacts").delete().gte("id", 0);
if (delErr) {
  console.error("Error limpiando contacts:", delErr.message);
  process.exit(1);
}

for (let i = 0; i < contacts.length; i += 50) {
  const { error } = await supabase
    .from("contacts")
    .insert(contacts.slice(i, i + 50));
  if (error) {
    console.error(`Error en lote ${i / 50 + 1}:`, error.message);
    process.exit(1);
  }
}
console.log("Contactos importados correctamente.");

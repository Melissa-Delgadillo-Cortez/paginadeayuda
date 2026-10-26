/**
 * Seed: importa los artículos generados por import-docx.mjs a Supabase
 * y crea el primer usuario administrador.
 *
 * Requisitos en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   ADMIN_EMAIL=admin@lbc.bo        (opcional)
 *   ADMIN_PASSWORD=...              (opcional, mín. 10 caracteres)
 *
 * Uso:
 *   node scripts/seed.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// --- cargar .env.local ---
const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("No existe .env.local — crea el archivo con las claves de Supabase.");
  process.exit(1);
}
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stripTags = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

async function main() {
  // --- artículos ---
  const file = path.join(process.cwd(), "src/content/articles.json");
  const articles = JSON.parse(fs.readFileSync(file, "utf8"));

  console.log(`Importando ${articles.length} artículos…`);
  const { error: delError } = await supabase
    .from("articles")
    .delete()
    .gte("id", 0);
  if (delError) {
    console.error("Error limpiando artículos:", delError.message);
    process.exit(1);
  }

  const rows = articles.map((a) => ({
    title: a.title.replace(/&emsp;|\s+/g, " ").trim().slice(0, 200),
    html: a.html,
    plain_text: stripTags(a.html),
    position: a.position,
  }));

  // insertar en lotes de 25
  for (let i = 0; i < rows.length; i += 25) {
    const batch = rows.slice(i, i + 25);
    const { error } = await supabase.from("articles").insert(batch);
    if (error) {
      console.error(`Error en lote ${i / 25 + 1}:`, error.message);
      process.exit(1);
    }
  }
  console.log("Artículos importados.");

  // --- primer administrador ---
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Administrador" },
    });
    if (error) {
      console.error("No se pudo crear el admin:", error.message);
    } else {
      await supabase.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
      console.log(`Admin creado: ${email}`);
    }
  } else {
    console.log("Sin ADMIN_EMAIL/ADMIN_PASSWORD: no se creó usuario admin.");
  }
}

main();

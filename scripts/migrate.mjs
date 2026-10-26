/**
 * Ejecuta supabase/migrations/0001_init.sql contra la base Postgres de Supabase.
 * Intenta conexión directa y luego pooler en regiones comunes.
 *
 * Uso: node scripts/migrate.mjs
 * Requiere DB_PASSWORD (contraseña de la base, NO la API key) por env o .env.local
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

// --- cargar .env.local ---
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const REF = process.env.SUPABASE_PROJECT_REF ?? "xlpiakvsbkpvovccvzuo";
const PASSWORD = process.env.DB_PASSWORD;
if (!PASSWORD) {
  console.error("Falta DB_PASSWORD en .env.local (la contraseña de la base de datos).");
  process.exit(1);
}

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/0001_init.sql"),
  "utf8"
);

const candidates = [
  `postgresql://postgres:${encodeURIComponent(PASSWORD)}@db.${REF}.supabase.co:5432/postgres`,
  ...["sa-east-1", "us-east-1", "us-east-2", "us-west-1", "eu-west-1", "eu-central-1"].map(
    (r) =>
      `postgresql://postgres.${REF}:${encodeURIComponent(PASSWORD)}@aws-0-${r}.pooler.supabase.com:5432/postgres`
  ),
];

for (const conn of candidates) {
  const host = new URL(conn).host;
  process.stdout.write(`Probando ${host} … `);
  const client = new pg.Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    console.log("conectado. Ejecutando migración…");
    await client.query(sql);
    console.log("Migración aplicada correctamente.");
    await client.end();
    process.exit(0);
  } catch (e) {
    console.log(`falló (${e.message.slice(0, 80)})`);
    try {
      await client.end();
    } catch {}
  }
}
console.error("No se pudo conectar a la base por ninguna vía.");
process.exit(1);

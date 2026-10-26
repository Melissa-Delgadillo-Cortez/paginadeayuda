import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role: SOLO uso en servidor (Server Actions / Route
 * Handlers), nunca en componentes de cliente. Necesario para gestionar
 * usuarios (auth.admin.*) y para el seed.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

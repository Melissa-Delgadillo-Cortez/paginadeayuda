"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanArticleHtml, htmlToText } from "@/lib/sanitize";

type Result = { ok: true } | { ok: false; error: string };

const MIN_PASSWORD = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Verifica sesión + rol admin. Devuelve el user.id del admin. */
async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Sin permisos de administrador");
  return user.id;
}

/** Registra un evento en la bitácora (no interrumpe el flujo si falla). */
async function audit(event: string, detail: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("audit_log")
      .insert({ user_id: user?.id, email: user?.email ?? "", event, detail });
  } catch {
    /* bitácora es best-effort */
  }
}

/** Llamada por cualquier usuario tras iniciar sesión (RLS exige user_id propio). */
export async function logLogin(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };
  const { error } = await supabase
    .from("audit_log")
    .insert({ user_id: user.id, email: user.email ?? "", event: "login" });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/* ==================== USUARIOS ==================== */

export async function createUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "user";
}): Promise<Result> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Correo inválido." };
  if (input.password.length < MIN_PASSWORD) {
    return {
      ok: false,
      error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
    };
  }
  if (!["admin", "user"].includes(input.role)) {
    return { ok: false, error: "Rol inválido." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName.trim() },
  });
  if (error) {
    return {
      ok: false,
      error:
        error.message === "User already registered"
          ? "Ya existe un usuario con ese correo."
          : `No se pudo crear el usuario: ${error.message}`,
    };
  }

  // El trigger crea el perfil con rol 'user'; subir a admin si corresponde
  if (input.role === "admin" && data.user) {
    await admin
      .from("profiles")
      .update({ role: "admin", full_name: input.fullName.trim() })
      .eq("id", data.user.id);
  }

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function deleteUser(userId: string): Promise<Result> {
  let me: string;
  try {
    me = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (userId === me) {
    return { ok: false, error: "No puedes eliminar tu propia cuenta." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function setUserRole(
  userId: string,
  role: "admin" | "user"
): Promise<Result> {
  let me: string;
  try {
    me = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!["admin", "user"].includes(role)) {
    return { ok: false, error: "Rol inválido." };
  }
  if (userId === me && role !== "admin") {
    return { ok: false, error: "No puedes quitarte el rol de administrador." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) return { ok: false, error: `No se pudo actualizar: ${error.message}` };

  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<Result> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (newPassword.length < MIN_PASSWORD) {
    return {
      ok: false,
      error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) return { ok: false, error: `No se pudo actualizar: ${error.message}` };

  return { ok: true };
}

/* ==================== ARTÍCULOS ==================== */

export async function saveArticle(input: {
  id?: number;
  title: string;
  html: string;
  position?: number;
  parent_id?: number | null;
}): Promise<Result & { id?: number }> {
  let me: string;
  try {
    me = await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const title = input.title.trim();
  if (!title) return { ok: false, error: "El título es obligatorio." };
  if (title.length > 200) return { ok: false, error: "Título demasiado largo." };

  const supabase = await createClient();

  // Validar padre y evitar ciclos (A dentro de B dentro de A)
  let parentId: number | null = input.parent_id ?? null;
  if (parentId) {
    if (parentId === input.id)
      return { ok: false, error: "Un artículo no puede ser su propio padre." };
    let cursor: number | null = parentId;
    for (let depth = 0; depth < 10 && cursor; depth++) {
      if (cursor === input.id)
        return {
          ok: false,
          error: "Eso crearía un ciclo: elige un padre que no sea sub-página de este artículo.",
        };
      const res: { data: { parent_id: number | null } | null } =
        await supabase
          .from("articles")
          .select("parent_id")
          .eq("id", cursor)
          .maybeSingle();
      if (!res.data) return { ok: false, error: "La página padre no existe." };
      cursor = res.data.parent_id;
    }
  } else {
    parentId = null;
  }

  const html = cleanArticleHtml(input.html);
  const payload = {
    title,
    html,
    plain_text: htmlToText(html),
    parent_id: parentId,
    updated_at: new Date().toISOString(),
    updated_by: me,
  };

  if (input.id) {
    const { error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", input.id);
    if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
    await audit("article_update", title);
    revalidatePath("/");
    revalidatePath(`/articulo/${input.id}`);
    revalidatePath("/admin/articulos");
    return { ok: true, id: input.id };
  }

  const { data: max } = await supabase
    .from("articles")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("articles")
    .insert({ ...payload, position: (max?.position ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return { ok: false, error: `No se pudo crear: ${error.message}` };

  await audit("article_create", title);
  revalidatePath("/");
  revalidatePath("/admin/articulos");
  return { ok: true, id: data.id };
}

export async function deleteArticle(id: number): Promise<Result> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  await audit("article_delete", `Artículo #${id}`);
  revalidatePath("/");
  revalidatePath("/admin/articulos");
  return { ok: true };
}

/* ==================== CONTACTOS / ROL DE TURNOS ==================== */

export type ContactInput = {
  area: string;
  grp?: string;
  person?: string;
  phone?: string;
  email?: string;
  support_name?: string;
  support_phone?: string;
  support_email?: string;
  escalation?: { name: string; phone: string; email: string }[];
  start_at?: string | null;
  end_at?: string | null;
  duty_type?: "principal" | "apoyo";
  extra?: { label: string; value: string }[];
  position?: number;
};

export async function saveContact(input: ContactInput & { id?: number }): Promise<Result> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!input.area?.trim()) return { ok: false, error: "El área es obligatoria." };

  const supabase = await createClient();
  const { id, ...fields } = input;
  const payload = {
    ...fields,
    area: fields.area.trim(),
    updated_at: new Date().toISOString(),
  };

  const { error } = id
    ? await supabase.from("contacts").update(payload).eq("id", id)
    : await supabase.from("contacts").insert(payload);
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };

  await audit(id ? "contact_update" : "contact_create", `${payload.area} · ${payload.grp} · ${payload.person}`);
  revalidatePath("/contactos");
  revalidatePath("/admin/contactos");
  return { ok: true };
}

/** Incidencia: termina el turno actual y asigna un reemplazo hasta su fin. */
export async function incidentReassign(input: {
  id: number;
  person: string;
  phone?: string;
  email?: string;
  reason: string;
}): Promise<Result> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const person = input.person.trim();
  if (!person) return { ok: false, error: "Indica el reemplazo." };
  if (!input.reason.trim()) return { ok: false, error: "Indica el motivo." };

  const supabase = await createClient();
  const { data: cur } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", input.id)
    .single();
  if (!cur) return { ok: false, error: "Turno no encontrado." };

  const nowIso = new Date().toISOString();
  const note = {
    label: "Incidencia",
    value: `${cur.person} → ${person} (${input.reason.trim()})`,
  };

  const { error: upErr } = await supabase
    .from("contacts")
    .update({
      end_at: nowIso,
      extra: [...(cur.extra ?? []), note],
      updated_at: nowIso,
    })
    .eq("id", input.id);
  if (upErr) return { ok: false, error: `No se pudo cerrar el turno: ${upErr.message}` };

  const { error: insErr } = await supabase.from("contacts").insert({
    area: cur.area,
    grp: cur.grp,
    person,
    phone: input.phone ?? cur.phone,
    email: input.email ?? cur.email,
    start_at: nowIso,
    end_at: cur.end_at,
    duty_type: cur.duty_type,
    extra: [note],
    position: cur.position + 1,
  });
  if (insErr) return { ok: false, error: `No se pudo asignar el reemplazo: ${insErr.message}` };

  await audit("incident", `${cur.area} · ${cur.grp}: ${note.value}`);
  revalidatePath("/contactos");
  revalidatePath("/admin/contactos");
  return { ok: true };
}

export async function deleteContact(id: number): Promise<Result> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };

  await audit("contact_delete", `Contacto #${id}`);
  revalidatePath("/contactos");
  revalidatePath("/admin/contactos");
  return { ok: true };
}

/* ==================== ENLACES ==================== */

export async function saveLink(input: {
  id?: number;
  name: string;
  url: string;
  position?: number;
}): Promise<Result> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const name = input.name.trim();
  let url = input.url.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };
  if (!url) return { ok: false, error: "La URL es obligatoria." };
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const supabase = await createClient();
  const { id, ...fields } = { ...input, name, url };
  const { error } = id
    ? await supabase.from("links").update(fields).eq("id", id)
    : await supabase.from("links").insert(fields);
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };

  await audit(id ? "link_update" : "link_create", name);
  revalidatePath("/enlaces");
  return { ok: true };
}

export async function deleteLink(id: number): Promise<Result> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("links").delete().eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };
  await audit("link_delete", `Enlace #${id}`);
  revalidatePath("/enlaces");
  return { ok: true };
}

/* ==================== ROTA: operadores y horarios ==================== */

export type ShiftInput = {
  dow: number;
  block?: number;
  start_min: number;
  end_min: number;
  is_libre: boolean;
};

export async function saveOperator(input: {
  id?: number;
  name: string;
  position?: number;
}): Promise<Result & { id?: number }> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const name = input.name.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };

  const supabase = await createClient();
  const { id, ...fields } = { ...input, name };
  const q = id
    ? supabase.from("operators").update(fields).eq("id", id).select("id").single()
    : supabase.from("operators").insert(fields).select("id").single();
  const { data, error } = await q;
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };

  await audit(id ? "operator_update" : "operator_create", name);
  revalidatePath("/rota");
  return { ok: true, id: data.id };
}

export async function deleteOperator(id: number): Promise<Result> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("operators").delete().eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar: ${error.message}` };
  await audit("operator_delete", `Operador #${id}`);
  revalidatePath("/rota");
  return { ok: true };
}

/** Reemplaza el horario semanal completo de un operador (hasta 2 turnos por día). */
export async function saveShifts(
  operatorId: number,
  shifts: ShiftInput[]
): Promise<Result> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const clean = shifts
    .filter((s) => Number.isInteger(s.dow) && s.dow >= 0 && s.dow <= 6)
    .map((s) => ({
      operator_id: operatorId,
      dow: s.dow,
      block: s.block === 2 ? 2 : 1,
      start_min: s.is_libre ? 0 : Math.max(0, Math.min(1439, s.start_min)),
      end_min: s.is_libre ? 0 : Math.max(0, Math.min(1439, s.end_min)),
      is_libre: !!s.is_libre,
    }));
  if (clean.length === 0) return { ok: false, error: "Sin días que guardar." };

  const supabase = await createClient();
  const { error: delErr } = await supabase
    .from("operator_shifts")
    .delete()
    .eq("operator_id", operatorId);
  if (delErr) return { ok: false, error: `No se pudo guardar: ${delErr.message}` };

  const { error } = await supabase.from("operator_shifts").insert(clean);
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };

  await audit("shifts_update", `Operador #${operatorId}`);
  revalidatePath("/rota");
  return { ok: true };
}


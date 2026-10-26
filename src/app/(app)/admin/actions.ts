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

  const html = cleanArticleHtml(input.html);
  const supabase = await createClient();
  const payload = {
    title,
    html,
    plain_text: htmlToText(html),
    updated_at: new Date().toISOString(),
    updated_by: me,
  };

  if (input.id) {
    const { error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", input.id);
    if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
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

  revalidatePath("/contactos");
  revalidatePath("/admin/contactos");
  return { ok: true };
}


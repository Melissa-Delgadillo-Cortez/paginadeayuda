-- Observaciones: nombres de persona, avisos solo admin con rango de fechas

alter table public.pendientes
  add column if not exists created_name text not null default '',
  add column if not exists done_name text not null default '';

alter table public.avisos
  add column if not exists created_name text not null default '',
  add column if not exists since_date date;  -- desde (opcional); until_date = hasta

-- Avisos: solo admin puede crearlos (antes cualquier autenticado)
drop policy if exists avisos_insert on public.avisos;
create policy avisos_insert on public.avisos
  for insert to authenticated with check (public.is_admin());

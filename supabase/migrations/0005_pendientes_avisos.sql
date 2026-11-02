-- Pendientes con alerta y avisos de ausencias/vacaciones

create table if not exists public.pendientes (
  id bigint generated always as identity primary key,
  title text not null,
  detail text not null default '',
  created_by uuid,
  created_email text not null default '',
  created_at timestamptz not null default now(),
  done boolean not null default false,
  done_by uuid,
  done_email text not null default '',
  done_at timestamptz,
  done_note text not null default ''
);

alter table public.pendientes enable row level security;

drop policy if exists pendientes_select on public.pendientes;
create policy pendientes_select on public.pendientes
  for select to authenticated using (true);
drop policy if exists pendientes_insert on public.pendientes;
create policy pendientes_insert on public.pendientes
  for insert to authenticated with check (created_by = auth.uid());
-- cualquier usuario puede marcar como gestionado (eso es el flujo)
drop policy if exists pendientes_update on public.pendientes;
create policy pendientes_update on public.pendientes
  for update to authenticated using (true) with check (true);
drop policy if exists pendientes_delete on public.pendientes;
create policy pendientes_delete on public.pendientes
  for delete to authenticated using (public.is_admin());

create table if not exists public.avisos (
  id bigint generated always as identity primary key,
  person text not null,                -- ejecutivo ausente / de vacaciones
  tipo text not null default 'ausente' check (tipo in ('ausente','vacaciones','otro')),
  detail text not null default '',
  until_date date,                     -- hasta cuándo aplica (null = indefinido)
  created_by uuid,
  created_email text not null default '',
  created_at timestamptz not null default now()
);

alter table public.avisos enable row level security;

drop policy if exists avisos_select on public.avisos;
create policy avisos_select on public.avisos
  for select to authenticated using (true);
drop policy if exists avisos_insert on public.avisos;
create policy avisos_insert on public.avisos
  for insert to authenticated with check (created_by = auth.uid());
drop policy if exists avisos_update on public.avisos;
create policy avisos_update on public.avisos
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists avisos_delete on public.avisos;
create policy avisos_delete on public.avisos
  for delete to authenticated using (public.is_admin());

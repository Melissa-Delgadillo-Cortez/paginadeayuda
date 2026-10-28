-- Enlaces externos, ROTA de operadores y bitácora de actividad

-- Contactos: tipo de turno (principal o ejecutivo de apoyo)
alter table public.contacts
  add column if not exists duty_type text not null default 'principal'
  check (duty_type in ('principal', 'apoyo'));

-- ============ ENLACES ============
create table if not exists public.links (
  id bigint generated always as identity primary key,
  name text not null,
  url text not null,
  position int not null default 0
);

alter table public.links enable row level security;

drop policy if exists links_select on public.links;
create policy links_select on public.links
  for select to authenticated using (true);
drop policy if exists links_write on public.links;
create policy links_insert on public.links
  for insert to authenticated with check (public.is_admin());
drop policy if exists links_update on public.links;
create policy links_update on public.links
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists links_delete on public.links;
create policy links_delete on public.links
  for delete to authenticated using (public.is_admin());

-- ============ ROTA: operadores y horario semanal ============
create table if not exists public.operators (
  id bigint generated always as identity primary key,
  name text not null,
  position int not null default 0
);

-- dow: 0=lunes … 6=domingo ; minutos desde medianoche
create table if not exists public.operator_shifts (
  id bigint generated always as identity primary key,
  operator_id bigint not null references public.operators(id) on delete cascade,
  dow smallint not null check (dow between 0 and 6),
  start_min smallint not null default 480,
  end_min smallint not null default 1080,
  is_libre boolean not null default false,
  unique (operator_id, dow)
);

alter table public.operators enable row level security;
alter table public.operator_shifts enable row level security;

drop policy if exists operators_select on public.operators;
create policy operators_select on public.operators
  for select to authenticated using (true);
drop policy if exists operators_insert on public.operators;
create policy operators_insert on public.operators
  for insert to authenticated with check (public.is_admin());
drop policy if exists operators_update on public.operators;
create policy operators_update on public.operators
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists operators_delete on public.operators;
create policy operators_delete on public.operators
  for delete to authenticated using (public.is_admin());

drop policy if exists shifts_select on public.operator_shifts;
create policy shifts_select on public.operator_shifts
  for select to authenticated using (true);
drop policy if exists shifts_insert on public.operator_shifts;
create policy shifts_insert on public.operator_shifts
  for insert to authenticated with check (public.is_admin());
drop policy if exists shifts_update on public.operator_shifts;
create policy shifts_update on public.operator_shifts
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists shifts_delete on public.operator_shifts;
create policy shifts_delete on public.operator_shifts
  for delete to authenticated using (public.is_admin());

-- ============ BITÁCORA ============
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  email text not null default '',
  event text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- Solo el admin lee la bitácora; cualquier autenticado registra su propio evento
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log
  for select to authenticated using (public.is_admin());
drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log
  for insert to authenticated with check (user_id = auth.uid());

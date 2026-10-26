-- Módulo de contactos / rol de turnos de emergencia

create table if not exists public.contacts (
  id bigint generated always as identity primary key,
  area text not null,                 -- pestaña: AUTOMOTORES, PERSONALES_VIDA…
  grp text not null default '',       -- ciudad, empresa o agrupador
  person text not null default '',    -- persona de turno / contacto
  phone text not null default '',
  email text not null default '',
  support_name text not null default '',
  support_phone text not null default '',
  support_email text not null default '',
  escalation jsonb not null default '[]',  -- [{name,phone,email}]
  start_at timestamptz,               -- inicio del turno (null = directorio)
  end_at timestamptz,                 -- fin del turno
  extra jsonb not null default '[]',  -- [{label,value}] campos adicionales
  position int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists contacts_area_idx on public.contacts (area, grp);
create index if not exists contacts_shift_idx on public.contacts (start_at, end_at);

alter table public.contacts enable row level security;

drop policy if exists contacts_select on public.contacts;
create policy contacts_select on public.contacts
  for select to authenticated using (true);

drop policy if exists contacts_insert on public.contacts;
create policy contacts_insert on public.contacts
  for insert to authenticated with check (public.is_admin());

drop policy if exists contacts_update on public.contacts;
create policy contacts_update on public.contacts
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists contacts_delete on public.contacts;
create policy contacts_delete on public.contacts
  for delete to authenticated using (public.is_admin());

-- LBC Página de Ayuda — esquema inicial
-- Ejecutar en el SQL Editor de Supabase o con `supabase db push`.

-- ============ PERFILES Y ROLES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

-- ============ ARTÍCULOS DE AYUDA ============
create table if not exists public.articles (
  id bigint generated always as identity primary key,
  title text not null,
  html text not null default '',
  plain_text text not null default '',
  position int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists articles_position_idx on public.articles (position);

-- ============ ROW LEVEL SECURITY ============
alter table public.profiles enable row level security;
alter table public.articles enable row level security;

-- Helper: ¿el usuario actual es admin? (security definer evita recursión)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Perfiles: cada usuario lee solo el suyo; admin lee y modifica todos
create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);

create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Artículos: cualquier usuario autenticado lee; solo admin escribe
create policy articles_select on public.articles
  for select to authenticated using (true);

create policy articles_insert on public.articles
  for insert to authenticated with check (public.is_admin());

create policy articles_update on public.articles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy articles_delete on public.articles
  for delete to authenticated using (public.is_admin());

-- ============ TRIGGER: perfil automático al crear usuario ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ BÚSQUEDA FULL-TEXT (español) ============
alter table public.articles
  add column if not exists fts tsvector
  generated always as (to_tsvector('spanish', title || ' ' || plain_text)) stored;

create index if not exists articles_fts_idx on public.articles using gin (fts);

create or replace function public.search_articles(q text)
returns table (id bigint, title text, snippet text, rank real)
language sql
stable
as $$
  select
    a.id,
    a.title,
    ts_headline(
      'spanish',
      a.plain_text,
      websearch_to_tsquery('spanish', q),
      'MaxWords=40, MinWords=18, ShortWord=3, MaxFragments=2, FragmentDelimiter='' … '''
    ) as snippet,
    ts_rank(a.fts, websearch_to_tsquery('spanish', q)) as rank
  from public.articles a
  where a.fts @@ websearch_to_tsquery('spanish', q)
  order by rank desc, a.position
  limit 30;
$$;

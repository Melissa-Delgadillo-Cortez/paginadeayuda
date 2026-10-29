-- Jerarquía de artículos (sub-páginas) y segundo turno por día en ROTA

-- Artículos con sub-páginas: parent_id apunta al artículo padre
alter table public.articles
  add column if not exists parent_id bigint references public.articles(id) on delete set null;
create index if not exists articles_parent_idx on public.articles (parent_id);

-- ROTA: hasta 2 turnos por día (block 1 o 2)
alter table public.operator_shifts
  drop constraint if exists operator_shifts_operator_id_dow_key;
alter table public.operator_shifts
  add column if not exists block smallint not null default 1;
create unique index if not exists operator_shifts_uniq
  on public.operator_shifts (operator_id, dow, block);

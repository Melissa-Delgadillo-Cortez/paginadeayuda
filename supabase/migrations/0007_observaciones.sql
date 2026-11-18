-- Observaciones: tipos de dia en ROTA + busqueda con coincidencia parcial

-- Tipo de dia del operador: normal | libre | vacaciones | extra | baja
alter table public.operator_shifts
  add column if not exists kind text not null default 'normal';
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'operator_shifts_kind_check'
  ) then
    alter table public.operator_shifts
      add constraint operator_shifts_kind_check
      check (kind in ('normal','libre','vacaciones','extra','baja'));
  end if;
end $$;

-- Busqueda: full-text + coincidencia parcial (subcadena) en titulo y texto.
-- "papani" ahora encuentra "papanicolau".
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
    coalesce(ts_rank(a.fts, websearch_to_tsquery('spanish', q)), 0)
      + case
          when a.title ilike '%' || q || '%' then 0.5
          when a.plain_text ilike '%' || q || '%' then 0.3
          else 0
        end as rank
  from public.articles a
  where length(trim(q)) > 0
    and (
      a.fts @@ websearch_to_tsquery('spanish', q)
      or a.title ilike '%' || q || '%'
      or a.plain_text ilike '%' || q || '%'
    )
  order by rank desc, a.position
  limit 30;
$$;

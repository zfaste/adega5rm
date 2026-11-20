-- Estoque institucional compartilhado, arquivamento e controle de acesso.

create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.institution_members (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'operator' check (role in ('admin', 'operator', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (institution_id, user_id)
);

insert into public.institutions (slug, name)
values ('gabinete-5rm', 'Gabinete da 5ª Região Militar')
on conflict (slug) do nothing;

alter table public.wines add column if not exists institution_id uuid references public.institutions(id) on delete restrict;
alter table public.wines add column if not exists archived_at timestamptz;
alter table public.wines add column if not exists archived_by uuid references auth.users(id) on delete set null;
alter table public.wine_movements add column if not exists institution_id uuid references public.institutions(id) on delete restrict;
alter table public.wine_imports add column if not exists institution_id uuid references public.institutions(id) on delete restrict;

update public.wines
set institution_id = (select id from public.institutions where slug = 'gabinete-5rm')
where institution_id is null;

update public.wine_movements movement
set institution_id = wine.institution_id
from public.wines wine
where movement.wine_id = wine.id
  and movement.institution_id is null;

update public.wine_imports
set institution_id = (select id from public.institutions where slug = 'gabinete-5rm')
where institution_id is null;

update public.wines
set location = 'Localização a confirmar'
where nullif(btrim(location), '') is null;

alter table public.wines alter column institution_id set not null;
alter table public.wine_movements alter column institution_id set not null;
alter table public.wine_imports alter column institution_id set not null;
alter table public.wines alter column location set not null;

insert into public.institution_members (institution_id, user_id, role)
select
  (select id from public.institutions where slug = 'gabinete-5rm'),
  source.user_id,
  'admin'
from (
  select user_id from public.wines where user_id is not null
  union
  select user_id from public.wine_movements where user_id is not null
  union
  select user_id from public.wine_imports where user_id is not null
) source
on conflict (institution_id, user_id) do nothing;

alter table public.wine_movements drop constraint if exists wine_movements_wine_id_fkey;
alter table public.wine_movements
  add constraint wine_movements_wine_id_fkey
  foreign key (wine_id) references public.wines(id) on delete restrict;

alter table public.wines drop constraint if exists wines_current_stock_nonnegative;
alter table public.wines
  add constraint wines_current_stock_nonnegative check (current_stock >= 0);
alter table public.wines drop constraint if exists wines_location_not_blank;
alter table public.wines
  add constraint wines_location_not_blank check (char_length(btrim(location)) > 0);

create index if not exists wines_institution_active_idx on public.wines (institution_id, archived_at);
create index if not exists wine_movements_institution_occurred_idx on public.wine_movements (institution_id, occurred_at desc);
create index if not exists wine_imports_institution_idx on public.wine_imports (institution_id);
create index if not exists wines_import_id_idx on public.wines (import_id);
create index if not exists institution_members_user_idx on public.institution_members (user_id, is_active);

create or replace function private.current_institution_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select member.institution_id
  from public.institution_members member
  where member.user_id = (select auth.uid())
    and member.is_active
  order by member.created_at
  limit 1;
$$;

create or replace function private.has_institution_role(p_institution_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.institution_members member
    where member.institution_id = p_institution_id
      and member.user_id = (select auth.uid())
      and member.is_active
      and member.role = any (p_roles)
  );
$$;

grant usage on schema private to authenticated;
revoke all on function private.current_institution_id() from public;
revoke all on function private.has_institution_role(uuid, text[]) from public;
grant execute on function private.current_institution_id() to authenticated;
grant execute on function private.has_institution_role(uuid, text[]) to authenticated;

alter table public.institutions enable row level security;
alter table public.institution_members enable row level security;

drop policy if exists "Users manage their wines" on public.wines;
drop policy if exists "Users manage their wine movements" on public.wine_movements;
drop policy if exists "Users manage their wine imports" on public.wine_imports;
drop policy if exists "Institution members can view institution" on public.institutions;
drop policy if exists "Members can view their institution" on public.institutions;
drop policy if exists "Members can view institution roles" on public.institution_members;
drop policy if exists "Admins manage institution roles" on public.institution_members;
drop policy if exists "Institution members can view wines" on public.wines;
drop policy if exists "Operators manage wines" on public.wines;
drop policy if exists "Institution members can view movements" on public.wine_movements;
drop policy if exists "Institution members can view imports" on public.wine_imports;
drop policy if exists "Operators manage imports" on public.wine_imports;

create policy "Members can view their institution"
on public.institutions for select to authenticated
using (id = (select private.current_institution_id()));

create policy "Members can view institution roles"
on public.institution_members for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_institution_role(institution_id, array['admin']))
);

create policy "Admins manage institution roles"
on public.institution_members for update to authenticated
using ((select private.has_institution_role(institution_id, array['admin'])))
with check (
  (select private.has_institution_role(institution_id, array['admin']))
  and (user_id <> (select auth.uid()) or (role = 'admin' and is_active))
);

create policy "Institution members can view wines"
on public.wines for select to authenticated
using ((select private.has_institution_role(institution_id, array['admin', 'operator', 'viewer'])));

create policy "Operators create wines"
on public.wines for insert to authenticated
with check ((select private.has_institution_role(institution_id, array['admin', 'operator'])));

create policy "Operators update wines"
on public.wines for update to authenticated
using ((select private.has_institution_role(institution_id, array['admin', 'operator'])))
with check ((select private.has_institution_role(institution_id, array['admin', 'operator'])));

create policy "Institution members can view movements"
on public.wine_movements for select to authenticated
using ((select private.has_institution_role(institution_id, array['admin', 'operator', 'viewer'])));

create policy "Institution members can view imports"
on public.wine_imports for select to authenticated
using ((select private.has_institution_role(institution_id, array['admin', 'operator', 'viewer'])));

create policy "Operators manage imports"
on public.wine_imports for all to authenticated
using ((select private.has_institution_role(institution_id, array['admin', 'operator'])))
with check ((select private.has_institution_role(institution_id, array['admin', 'operator'])));

create or replace function public.record_wine_movement(
  p_wine_id uuid,
  p_kind text,
  p_quantity integer,
  p_note text default null,
  p_guide_reference text default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_stock integer;
  v_institution_id uuid;
begin
  if p_kind not in ('entrada', 'saida') or p_quantity is null or p_quantity <= 0 then
    raise exception 'Movimentação inválida';
  end if;

  v_institution_id := private.current_institution_id();
  if v_institution_id is null or not private.has_institution_role(v_institution_id, array['admin', 'operator']) then
    raise exception 'Você não tem permissão para movimentar este estoque';
  end if;

  select current_stock into v_stock
  from public.wines
  where id = p_wine_id
    and institution_id = v_institution_id
    and archived_at is null
  for update;

  if not found then
    raise exception 'Garrafa não encontrada ou arquivada';
  end if;

  if p_kind = 'saida' and p_quantity > v_stock then
    raise exception 'Quantidade de saída superior ao estoque disponível (% garrafas)', v_stock;
  end if;

  update public.wines
  set initial_quantity = initial_quantity + case when p_kind = 'entrada' then p_quantity else 0 end,
      quantity_out = quantity_out + case when p_kind = 'saida' then p_quantity else 0 end,
      current_stock = current_stock + case when p_kind = 'entrada' then p_quantity else -p_quantity end,
      updated_at = now()
  where id = p_wine_id;

  insert into public.wine_movements (user_id, institution_id, wine_id, kind, quantity, note, guide_reference)
  values ((select auth.uid()), v_institution_id, p_wine_id, p_kind, p_quantity, nullif(btrim(p_note), ''), nullif(btrim(p_guide_reference), ''));

  return v_stock + case when p_kind = 'entrada' then p_quantity else -p_quantity end;
end;
$$;

create or replace function public.record_wine_issue_batch(
  p_items jsonb,
  p_guide_reference text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item record;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Informe ao menos uma garrafa para a saída';
  end if;

  for item in
    select (value ->> 'wine_id')::uuid as wine_id, sum((value ->> 'quantity')::integer) as quantity
    from jsonb_array_elements(p_items)
    group by (value ->> 'wine_id')::uuid
    order by (value ->> 'wine_id')::uuid
  loop
    perform public.record_wine_movement(item.wine_id, 'saida', item.quantity, p_note, p_guide_reference);
  end loop;
end;
$$;

create or replace function public.append_wine_note(p_wine_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_institution_id uuid;
begin
  if nullif(btrim(p_note), '') is null then
    raise exception 'Observação vazia';
  end if;

  v_institution_id := private.current_institution_id();
  if v_institution_id is null or not private.has_institution_role(v_institution_id, array['admin', 'operator']) then
    raise exception 'Você não tem permissão para editar este estoque';
  end if;

  update public.wines
  set history_notes = concat_ws(E'\n', nullif(history_notes, ''), btrim(p_note)), updated_at = now()
  where id = p_wine_id and institution_id = v_institution_id and archived_at is null;
  if not found then raise exception 'Garrafa não encontrada ou arquivada'; end if;
end;
$$;

create or replace function public.archive_wine(p_wine_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_institution_id uuid;
begin
  v_institution_id := private.current_institution_id();
  if v_institution_id is null or not private.has_institution_role(v_institution_id, array['admin']) then
    raise exception 'Somente administradores podem arquivar garrafas';
  end if;

  update public.wines
  set archived_at = now(), archived_by = (select auth.uid()), updated_at = now()
  where id = p_wine_id and institution_id = v_institution_id and archived_at is null;
  if not found then raise exception 'Garrafa não encontrada ou já arquivada'; end if;
end;
$$;

create or replace function public.log_initial_wine_entry()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.initial_quantity > 0 then
    insert into public.wine_movements (user_id, institution_id, wine_id, kind, quantity, note, occurred_at)
    values (new.user_id, new.institution_id, new.id, 'entrada', new.initial_quantity, 'Estoque inicial', new.created_at);
  end if;
  return new;
end;
$$;

revoke all on function public.record_wine_movement(uuid, text, integer, text, text) from public;
revoke all on function public.record_wine_issue_batch(jsonb, text, text) from public;
revoke all on function public.append_wine_note(uuid, text) from public;
revoke all on function public.archive_wine(uuid) from public;
grant execute on function public.record_wine_movement(uuid, text, integer, text, text) to authenticated;
grant execute on function public.record_wine_issue_batch(jsonb, text, text) to authenticated;
grant execute on function public.append_wine_note(uuid, text) to authenticated;
grant execute on function public.archive_wine(uuid) to authenticated;

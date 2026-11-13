-- ADEGA MVP: ledger imutável de estoque e permissões aplicadas no banco.
create extension if not exists "pgcrypto";

create type public.app_role as enum ('admin','gestor','operador','consulta');
create type public.movement_kind as enum ('entrada','saida','ajuste','estorno','estoque_inicial');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'consulta',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1))); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table public.locations (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  min_stock integer not null default 0 check (min_stock >= 0), created_at timestamptz not null default now()
);

create table public.wines (
  id uuid primary key default gen_random_uuid(),
  name text not null, producer text, country text, region text, wine_type text not null,
  grapes text, vintage integer check (vintage between 1800 and 2200), volume_ml integer not null default 750,
  alcohol_percent numeric(4,1), description text, service_temperature text, pairing_notes text,
  estimated_value numeric(12,2) check (estimated_value >= 0), price_source_url text, price_checked_at date,
  photo_path text, active boolean not null default true, created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);
create unique index wines_identity on public.wines (name, coalesce(producer,''), coalesce(vintage,0), volume_ml);

create table public.recipients (
  id uuid primary key default gen_random_uuid(), name text not null, rank_or_title text,
  organization text, active boolean not null default true, created_at timestamptz not null default now()
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(), receipt_number text not null unique, received_on date not null,
  origin text not null default 'Receita Federal', document_reference text, received_by text,
  notes text, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.receipt_items (
  id uuid primary key default gen_random_uuid(), receipt_id uuid not null references public.receipts(id),
  wine_id uuid not null references public.wines(id), location_id uuid references public.locations(id),
  expected_quantity integer not null check(expected_quantity > 0), counted_quantity integer not null check(counted_quantity >= 0),
  accepted_quantity integer not null check(accepted_quantity >= 0), conservation_state text, notes text
);
create table public.distributions (
  id uuid primary key default gen_random_uuid(), distributed_on date not null, recipient_id uuid not null references public.recipients(id),
  purpose text not null, delivered_by text not null, document_reference text, notes text,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.distribution_items (
  id uuid primary key default gen_random_uuid(), distribution_id uuid not null references public.distributions(id),
  wine_id uuid not null references public.wines(id), location_id uuid references public.locations(id), quantity integer not null check(quantity > 0)
);
create table public.stock_ledger (
  id uuid primary key default gen_random_uuid(), wine_id uuid not null references public.wines(id), location_id uuid references public.locations(id),
  movement_type public.movement_kind not null, quantity_delta integer not null check(quantity_delta <> 0),
  receipt_item_id uuid references public.receipt_items(id), distribution_item_id uuid references public.distribution_items(id),
  reason text, performed_by uuid not null references public.profiles(id), occurred_at timestamptz not null default now(),
  constraint ledger_source check ((receipt_item_id is not null)::integer + (distribution_item_id is not null)::integer <= 1)
);
create index stock_ledger_wine_idx on public.stock_ledger(wine_id, occurred_at desc);
create view public.v_stock as select wine_id, location_id, sum(quantity_delta)::integer as quantity from public.stock_ledger group by wine_id, location_id;

create or replace function public.can_manage_stock() returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and active and role in ('admin','gestor','operador')) $$;
create or replace function public.can_manage_admin() returns boolean language sql stable security definer set search_path = public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and active and role='admin') $$;

-- RPCs are the only write paths for confirmed stock changes.
create or replace function public.register_receipt(p_receipt jsonb, p_items jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_receipt uuid; v_item jsonb; v_item_id uuid;
begin
 if not public.can_manage_stock() then raise exception 'Sem permissão para registrar entradas'; end if;
 insert into receipts(receipt_number,received_on,origin,document_reference,received_by,notes,created_by)
 values(p_receipt->>'receipt_number',(p_receipt->>'received_on')::date,coalesce(p_receipt->>'origin','Receita Federal'),p_receipt->>'document_reference',p_receipt->>'received_by',p_receipt->>'notes',auth.uid()) returning id into v_receipt;
 for v_item in select * from jsonb_array_elements(p_items) loop
  insert into receipt_items(receipt_id,wine_id,location_id,expected_quantity,counted_quantity,accepted_quantity,conservation_state,notes)
  values(v_receipt,(v_item->>'wine_id')::uuid,nullif(v_item->>'location_id','')::uuid,(v_item->>'expected_quantity')::int,(v_item->>'counted_quantity')::int,(v_item->>'accepted_quantity')::int,v_item->>'conservation_state',v_item->>'notes') returning id into v_item_id;
  insert into stock_ledger(wine_id,location_id,movement_type,quantity_delta,receipt_item_id,performed_by)
  values((v_item->>'wine_id')::uuid,nullif(v_item->>'location_id','')::uuid,'entrada',(v_item->>'accepted_quantity')::int,v_item_id,auth.uid());
 end loop; return v_receipt;
end $$;
create or replace function public.register_distribution(p_distribution jsonb, p_items jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_distribution uuid; v_item jsonb; v_item_id uuid; v_stock integer;
begin
 if not public.can_manage_stock() then raise exception 'Sem permissão para registrar saídas'; end if;
 insert into distributions(distributed_on,recipient_id,purpose,delivered_by,document_reference,notes,created_by)
 values((p_distribution->>'distributed_on')::date,(p_distribution->>'recipient_id')::uuid,p_distribution->>'purpose',p_distribution->>'delivered_by',p_distribution->>'document_reference',p_distribution->>'notes',auth.uid()) returning id into v_distribution;
 for v_item in select * from jsonb_array_elements(p_items) loop
  -- serializa baixas do mesmo vinho/local durante a transação para impedir saldo negativo concorrente
  perform pg_advisory_xact_lock(hashtext((v_item->>'wine_id') || ':' || coalesce(v_item->>'location_id','sem-local')));
  select coalesce(sum(quantity_delta),0) into v_stock from stock_ledger where wine_id=(v_item->>'wine_id')::uuid and location_id is not distinct from nullif(v_item->>'location_id','')::uuid;
  if v_stock < (v_item->>'quantity')::int then raise exception 'Estoque insuficiente'; end if;
  insert into distribution_items(distribution_id,wine_id,location_id,quantity) values(v_distribution,(v_item->>'wine_id')::uuid,nullif(v_item->>'location_id','')::uuid,(v_item->>'quantity')::int) returning id into v_item_id;
  insert into stock_ledger(wine_id,location_id,movement_type,quantity_delta,distribution_item_id,performed_by) values((v_item->>'wine_id')::uuid,nullif(v_item->>'location_id','')::uuid,'saida',-(v_item->>'quantity')::int,v_item_id,auth.uid());
 end loop; return v_distribution;
end $$;

alter table public.profiles enable row level security; alter table public.wines enable row level security; alter table public.locations enable row level security; alter table public.recipients enable row level security; alter table public.receipts enable row level security; alter table public.receipt_items enable row level security; alter table public.distributions enable row level security; alter table public.distribution_items enable row level security; alter table public.stock_ledger enable row level security;
create policy "authenticated read" on public.wines for select to authenticated using (true);
create policy "authenticated read" on public.locations for select to authenticated using (true);
create policy "authenticated read" on public.recipients for select to authenticated using (true);
create policy "authenticated read" on public.receipts for select to authenticated using (true);
create policy "authenticated read" on public.receipt_items for select to authenticated using (true);
create policy "authenticated read" on public.distributions for select to authenticated using (true);
create policy "authenticated read" on public.distribution_items for select to authenticated using (true);
create policy "authenticated read" on public.stock_ledger for select to authenticated using (true);
create policy "own profile" on public.profiles for select to authenticated using(id=auth.uid());
create policy "staff create wine" on public.wines for insert to authenticated with check(public.can_manage_stock());
create policy "staff update wine" on public.wines for update to authenticated using(public.can_manage_stock()) with check(public.can_manage_stock());
create policy "staff create recipient" on public.recipients for insert to authenticated with check(public.can_manage_stock());
revoke all on public.stock_ledger, public.receipts, public.receipt_items, public.distributions, public.distribution_items from authenticated;
grant select on public.v_stock to authenticated;
grant execute on function public.register_receipt(jsonb,jsonb), public.register_distribution(jsonb,jsonb) to authenticated;

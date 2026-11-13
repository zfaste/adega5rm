-- Fase 2: conferência física e trilha de auditoria institucional.
create type public.inventory_status as enum ('em_andamento','concluido','cancelado');

create table public.inventory_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status public.inventory_status not null default 'em_andamento',
  location_id uuid references public.locations(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  started_by uuid not null references public.profiles(id),
  notes text
);

create table public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory_sessions(id) on delete cascade,
  wine_id uuid not null references public.wines(id),
  system_quantity integer not null check(system_quantity >= 0),
  counted_quantity integer check(counted_quantity >= 0),
  counted_at timestamptz,
  counted_by uuid references public.profiles(id),
  notes text,
  unique(inventory_id, wine_id)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  occurred_at timestamptz not null default now()
);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, occurred_at desc);

create or replace function public.audit_row_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.audit_events(actor_id,action,entity_type,entity_id,before_data,after_data)
 values(auth.uid(),tg_op, tg_table_name, coalesce(new.id,old.id),
   case when tg_op='INSERT' then null else to_jsonb(old) end,
   case when tg_op='DELETE' then null else to_jsonb(new) end);
 return coalesce(new,old);
end $$;

create trigger audit_wines after insert or update or delete on public.wines for each row execute procedure public.audit_row_change();
create trigger audit_ledger after insert or update or delete on public.stock_ledger for each row execute procedure public.audit_row_change();
create trigger audit_receipts after insert or update or delete on public.receipts for each row execute procedure public.audit_row_change();
create trigger audit_distributions after insert or update or delete on public.distributions for each row execute procedure public.audit_row_change();

alter table public.inventory_sessions enable row level security;
alter table public.inventory_counts enable row level security;
alter table public.audit_events enable row level security;
create policy "authenticated read inventory" on public.inventory_sessions for select to authenticated using(true);
create policy "authenticated read counts" on public.inventory_counts for select to authenticated using(true);
create policy "admin reads audit" on public.audit_events for select to authenticated using(public.can_manage_admin());
create policy "staff manages inventory" on public.inventory_sessions for all to authenticated using(public.can_manage_stock()) with check(public.can_manage_stock());
create policy "staff manages counts" on public.inventory_counts for all to authenticated using(public.can_manage_stock()) with check(public.can_manage_stock());

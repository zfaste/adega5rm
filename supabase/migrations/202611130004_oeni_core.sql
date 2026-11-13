-- Base dos módulos avançados: informações enológicas, garrafas, posições, cotações e avaliações.
alter table public.wines add column if not exists brand text;
alter table public.wines add column if not exists denomination text;
alter table public.wines add column if not exists classification text;
alter table public.wines add column if not exists decanting_minutes integer;
alter table public.wines add column if not exists aging_potential text;
alter table public.wines add column if not exists ideal_from_year integer;
alter table public.wines add column if not exists ideal_until_year integer;
alter table public.wines add column if not exists tasting_notes text;
alter table public.wines add column if not exists maturity_stage text check (maturity_stage in ('jovem','aproximacao','auge','maduro','declinio'));

alter table public.locations add column if not exists capacity integer check(capacity is null or capacity >= 0);
alter table public.locations add column if not exists rows_count integer not null default 1 check(rows_count > 0);
alter table public.locations add column if not exists columns_count integer not null default 1 check(columns_count > 0);
alter table public.locations add column if not exists depth_count integer not null default 1 check(depth_count > 0);

create table if not exists public.bottles (
 id uuid primary key default gen_random_uuid(), wine_id uuid not null references public.wines(id), location_id uuid references public.locations(id),
 row_number integer, column_number integer, depth_number integer, status text not null default 'disponivel' check(status in ('disponivel','reservada','baixada','oculta')),
 lot_reference text, received_at date, created_at timestamptz not null default now(),
 unique(location_id,row_number,column_number,depth_number)
);
create table if not exists public.wine_prices (
 id uuid primary key default gen_random_uuid(), wine_id uuid not null references public.wines(id), amount numeric(12,2) not null check(amount>=0), currency text not null default 'BRL',
 source_name text not null, source_url text, checked_at timestamptz not null default now(), kind text not null default 'mercado' check(kind in ('mercado','declarado','pago'))
);
create table if not exists public.tasting_reviews (
 id uuid primary key default gen_random_uuid(), wine_id uuid not null references public.wines(id), reviewer_id uuid not null references public.profiles(id),
 rating numeric(3,1) check(rating between 0 and 10), aroma text, flavor text, pairing text, notes text, created_at timestamptz not null default now()
);
create table if not exists public.scanner_jobs (
 id uuid primary key default gen_random_uuid(), created_by uuid not null references public.profiles(id), image_path text, barcode text,
 status text not null default 'pendente' check(status in ('pendente','processando','revisao','concluido','falhou')), extracted_data jsonb, created_at timestamptz not null default now()
);

alter table public.bottles enable row level security; alter table public.wine_prices enable row level security; alter table public.tasting_reviews enable row level security; alter table public.scanner_jobs enable row level security;
create policy "authenticated reads bottles" on public.bottles for select to authenticated using(true);
create policy "staff manages bottles" on public.bottles for all to authenticated using(public.can_manage_stock()) with check(public.can_manage_stock());
create policy "authenticated reads prices" on public.wine_prices for select to authenticated using(true);
create policy "staff manages prices" on public.wine_prices for all to authenticated using(public.can_manage_stock()) with check(public.can_manage_stock());
create policy "authenticated reads reviews" on public.tasting_reviews for select to authenticated using(true);
create policy "authenticated creates reviews" on public.tasting_reviews for insert to authenticated with check(reviewer_id=auth.uid());
create policy "authenticated reads own scanner jobs" on public.scanner_jobs for select to authenticated using(created_by=auth.uid() or public.can_manage_stock());
create policy "staff creates scanner jobs" on public.scanner_jobs for insert to authenticated with check(created_by=auth.uid() and public.can_manage_stock());

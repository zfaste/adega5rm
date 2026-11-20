-- Pedidos públicos de acesso, analisados apenas por administradores na aplicação.
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  email text not null check (char_length(btrim(email)) > 3),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create unique index if not exists access_requests_one_pending_email
  on public.access_requests (institution_id, lower(email))
  where status = 'pending';

create index if not exists access_requests_pending_idx
  on public.access_requests (institution_id, status, requested_at);

alter table public.access_requests enable row level security;
revoke all on table public.access_requests from anon, authenticated;

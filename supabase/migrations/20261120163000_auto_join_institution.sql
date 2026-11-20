-- Toda conta confirmada pertence ao estoque único da Adega 5ª RM.
create or replace function private.auto_join_institution()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.institution_members (institution_id, user_id, role, is_active)
  select id, new.id, 'operator', true
  from public.institutions
  where slug = 'gabinete-5rm'
  on conflict (institution_id, user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.auto_join_institution() from public;

drop trigger if exists auto_join_institution_on_signup on auth.users;
create trigger auto_join_institution_on_signup
  after insert on auth.users
  for each row execute function private.auto_join_institution();

insert into public.institution_members (institution_id, user_id, role, is_active)
select institution.id, account.id, 'operator', true
from public.institutions institution
cross join auth.users account
where institution.slug = 'gabinete-5rm'
on conflict (institution_id, user_id) do nothing;

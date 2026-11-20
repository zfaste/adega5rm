-- Remove uma superfície de RPC desnecessária e simplifica as políticas de importação.

revoke all on function public.log_initial_wine_entry() from public;
revoke all on function public.log_initial_wine_entry() from anon;
revoke all on function public.log_initial_wine_entry() from authenticated;

drop policy if exists "Institution members can view imports" on public.wine_imports;
drop policy if exists "Operators manage imports" on public.wine_imports;

create policy "Institution members can view imports"
on public.wine_imports for select to authenticated
using ((select private.has_institution_role(institution_id, array['admin', 'operator', 'viewer'])));

create policy "Operators create imports"
on public.wine_imports for insert to authenticated
with check ((select private.has_institution_role(institution_id, array['admin', 'operator'])));

create policy "Operators update imports"
on public.wine_imports for update to authenticated
using ((select private.has_institution_role(institution_id, array['admin', 'operator'])))
with check ((select private.has_institution_role(institution_id, array['admin', 'operator'])));

create index if not exists wines_archived_by_idx on public.wines (archived_by);

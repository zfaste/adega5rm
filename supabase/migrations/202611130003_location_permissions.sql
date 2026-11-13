-- Permite que a equipe autorizada mantenha os locais físicos da adega.
create policy "staff manages locations" on public.locations
for all to authenticated
using (public.can_manage_stock())
with check (public.can_manage_stock());

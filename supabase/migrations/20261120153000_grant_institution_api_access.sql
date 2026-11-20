-- Data API access is controlled by both table grants and RLS policies.
-- Keep privileges minimal; the policies created in the institutional-security
-- migration remain responsible for determining which rows each member sees.

grant select on table public.institutions to authenticated;

grant select, update on table public.institution_members to authenticated;

grant select, insert, update on table public.wines to authenticated;

grant select on table public.wine_movements to authenticated;

grant select, insert, update on table public.wine_imports to authenticated;

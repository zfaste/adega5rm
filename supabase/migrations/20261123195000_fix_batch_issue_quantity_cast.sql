-- sum(integer) retorna bigint no PostgreSQL. A função unitária recebe integer,
-- portanto convertemos o total agrupado antes de registrar cada saída.
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
    if item.quantity > 2147483647 then
      raise exception 'Quantidade de saída inválida';
    end if;
    perform public.record_wine_movement(item.wine_id, 'saida', item.quantity::integer, p_note, p_guide_reference);
  end loop;
end;
$$;

revoke all on function public.record_wine_issue_batch(jsonb, text, text) from public;
grant execute on function public.record_wine_issue_batch(jsonb, text, text) to authenticated;

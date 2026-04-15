-- Harden stats trigger so order status updates do not fail admin order updates.
-- Fixes:
-- 1) Avoid unsafe OLD access patterns on INSERT branches.
-- 2) Avoid numeric cast failures from malformed JSON values.
-- 3) Avoid duplicate key errors when an order re-enters completed status.

create or replace function public.create_stat_from_completed_order()
returns trigger
language plpgsql
as $$
declare
  v_total_weight numeric(10,2) := 0;
  v_total_revenue numeric(10,2) := 0;
  v_total_text text;
  v_weight_text text;
begin
  -- Only act when order becomes completed (insert as completed OR status transition to completed).
  if new.status = 'completed' and (tg_op = 'INSERT' or coalesce(old.status, '') <> 'completed') then
    v_total_text := coalesce(new.totals->>'total', '');
    if v_total_text ~ '^[0-9]+(\.[0-9]+)?$' then
      v_total_revenue := v_total_text::numeric;
    end if;

    v_weight_text := coalesce(new.metadata->>'totalWeight', '');
    if v_weight_text = '' then
      v_weight_text := coalesce(new.metadata->>'weightGrams', '');
    end if;
    if v_weight_text ~ '^[0-9]+(\.[0-9]+)?$' then
      v_total_weight := v_weight_text::numeric;
    end if;

    insert into public.admin_order_stats (
      order_code,
      order_date,
      order_type,
      customer_name,
      customer_email,
      customer_phone,
      revenue,
      weight_grams,
      item_count,
      linked_order_id,
      is_completed,
      is_active,
      notes
    ) values (
      new.order_code,
      new.created_at,
      'site',
      new.customer_name,
      new.customer_email,
      new.customer_phone,
      v_total_revenue,
      v_total_weight,
      1,
      new.id,
      true,
      true,
      'Auto-created from site order'
    )
    on conflict (order_code) do update
      set order_date = excluded.order_date,
          customer_name = excluded.customer_name,
          customer_email = excluded.customer_email,
          customer_phone = excluded.customer_phone,
          revenue = excluded.revenue,
          weight_grams = excluded.weight_grams,
          linked_order_id = excluded.linked_order_id,
          is_completed = true,
          is_active = true,
          notes = excluded.notes,
          updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_order_stats_on_complete on public.orders;
create trigger trg_order_stats_on_complete
after insert or update on public.orders
for each row
execute function public.create_stat_from_completed_order();

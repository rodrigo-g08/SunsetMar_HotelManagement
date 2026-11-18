-- =====================================================================
-- Hito 5 · Inicio con indicadores
-- Ventas del día por tramo horario, cobros por método y ocupación de
-- los últimos 7 días, calculados en la base en una sola llamada.
-- =====================================================================

create or replace function dashboard(p_fecha date) returns jsonb language sql stable as $$
  with m as (
    select tipo, metodo, importe, extract(hour from fecha_operacion at time zone 'America/Lima')::int as h
    from movimientos where (fecha_operacion at time zone 'America/Lima')::date = p_fecha
  ),
  tramos as (select unnest(array[0, 8, 10, 12, 14, 16, 18, 20, 22]) as t),
  dias as (select (p_fecha - g)::date as d from generate_series(6, 0, -1) g),
  operativas as (select count(*)::numeric n from habitaciones where estado <> 'fuera_servicio')
  select jsonb_build_object(
    'fecha', p_fecha,
    'ventas_por_tramo', (select jsonb_agg(jsonb_build_object(
        't', t,
        'alojamiento', coalesce((select sum(importe) from m where tipo = 'alojamiento' and h >= t and h < case when t = 0 then 8 else t + 2 end), 0),
        'ab', coalesce((select sum(importe) from m where tipo = 'ab' and h >= t and h < case when t = 0 then 8 else t + 2 end), 0)
      ) order by t) from tramos),
    'alojamiento', coalesce((select sum(importe) from m where tipo = 'alojamiento'), 0),
    'ab', coalesce((select sum(importe) from m where tipo = 'ab'), 0),
    'egresos', coalesce((select sum(importe) from m where tipo in ('egreso', 'devolucion')), 0),
    'por_metodo', jsonb_build_object(
      'efectivo', coalesce((select sum(importe) from m where metodo = 'efectivo' and tipo in ('alojamiento','ab')), 0),
      'yape', coalesce((select sum(importe) from m where metodo = 'yape' and tipo in ('alojamiento','ab')), 0),
      'tarjeta', coalesce((select sum(importe) from m where metodo = 'tarjeta' and tipo in ('alojamiento','ab')), 0)),
    -- Ocupación de cada noche: habitaciones con estadía a las 21:00.
    'semana', (select jsonb_agg(jsonb_build_object('fecha', d, 'pct',
        round(100 * (select count(distinct r.habitacion) from reservas r
          where r.estado <> 'cancelada'
            and r.entrada <= ((d + time '21:00') at time zone 'America/Lima')
            and r.salida > ((d + time '21:00') at time zone 'America/Lima')) / greatest((select n from operativas), 1)))
      order by d) from dias)
  )
$$;

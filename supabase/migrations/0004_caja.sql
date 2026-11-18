-- =====================================================================
-- Hito 4 · Caja
-- Caja por turno con fondo fijo, ventas A&B con ficha digitada, egresos,
-- cierre por denominaciones, reporte diario y exportación.
-- =====================================================================

create table caja_turnos (
  id uuid primary key default gen_random_uuid(),
  turno turno_t not null,
  recepcionista text not null,
  sesion_id uuid references sesiones(id),
  apertura_en timestamptz not null default now(),
  fondo_inicial numeric(10,2) not null check (fondo_inicial >= 0),
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada')),
  cierre_en timestamptz,
  denominaciones jsonb,
  contado numeric(10,2),
  esperado numeric(10,2),
  diferencia numeric(10,2),
  queda_fondo numeric(10,2),
  entregado numeric(10,2),
  recibe text,
  observaciones text,
  cerrado_por text
);
-- Solo una caja abierta a la vez: la caja física es una sola.
create unique index caja_una_abierta on caja_turnos ((true)) where estado = 'abierta';

-- ---------- Ventas A&B y otros productos ----------
create table ventas_ab (
  id uuid primary key default gen_random_uuid(),
  ficha text not null unique check (ficha ~ '^[0-9]{1,8}$'),
  habitacion text references habitaciones(numero),
  reserva_id uuid references reservas(id),
  metodo metodo_t not null,
  total numeric(10,2) not null check (total > 0),
  historico boolean not null default false,
  fecha_operacion timestamptz not null default now(),
  sesion_id uuid references sesiones(id),
  recepcionista text,
  creado_en timestamptz not null default now()
);

create table venta_items (
  venta_id uuid not null references ventas_ab(id) on delete cascade,
  producto_id smallint not null references productos(id),
  nombre text not null,
  cantidad smallint not null check (cantidad > 0),
  precio_unit numeric(10,2) not null,
  primary key (venta_id, producto_id)
);

alter table movimientos add column caja_turno_id uuid references caja_turnos(id);
alter table movimientos add column venta_id uuid references ventas_ab(id);
create index movimientos_caja_idx on movimientos (caja_turno_id);

-- Todo cobro, egreso o devolución del día entra a la caja abierta y toma su turno.
-- Así, si la tarde recibe la caja a las 14:00, los cobros de 14:00 a 17:00 son de la tarde.
create or replace function movimiento_a_caja() returns trigger language plpgsql as $$
declare c caja_turnos;
begin
  if new.historico then return new; end if;
  select * into c from caja_turnos where estado = 'abierta';
  if not found then raise exception 'Abra la caja del turno antes de registrar cobros o egresos'; end if;
  new.caja_turno_id := c.id;
  new.turno := c.turno;
  return new;
end $$;
create trigger movimientos_caja before insert on movimientos for each row execute function movimiento_a_caja();

-- ---------- Apertura ----------
create or replace function abrir_caja(p_turno turno_t, p_fondo numeric, p_sesion uuid, p_recep text) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  if exists (select 1 from caja_turnos where estado = 'abierta') then
    raise exception 'Ya hay una caja abierta. Ciérrela antes de abrir otra';
  end if;
  insert into caja_turnos (turno, recepcionista, sesion_id, fondo_inicial) values (p_turno, p_recep, p_sesion, p_fondo) returning id into v_id;
  perform auditar(p_sesion, p_recep, 'apertura_caja', 'caja', v_id::text, jsonb_build_object('fondo', p_fondo, 'turno', p_turno));
  return v_id;
end $$;

-- ---------- Resumen de una caja ----------
create or replace function resumen_caja(p_caja uuid) returns jsonb language sql stable as $$
  with m as (select * from movimientos where caja_turno_id = p_caja),
  c as (select * from caja_turnos where id = p_caja)
  select jsonb_build_object(
    'fondo', (select fondo_inicial from c),
    'ingresos_efectivo', coalesce((select sum(importe) from m where metodo = 'efectivo' and tipo in ('alojamiento','ab')), 0),
    'egresos_efectivo', coalesce((select sum(importe) from m where metodo = 'efectivo' and tipo in ('egreso','devolucion')), 0),
    'esperado', (select fondo_inicial from c)
      + coalesce((select sum(case when tipo in ('alojamiento','ab') then importe else -importe end) from m where metodo = 'efectivo'), 0),
    'yape', coalesce((select sum(case when tipo in ('alojamiento','ab') then importe else -importe end) from m where metodo = 'yape'), 0),
    'tarjeta', coalesce((select sum(case when tipo in ('alojamiento','ab') then importe else -importe end) from m where metodo = 'tarjeta'), 0),
    'movimientos', (select count(*) from m)
  )
$$;

-- ---------- Cierre ----------
-- p_denominaciones: {"200": 0, "100": 1, "50": 2, ... "0.5": 0, "0.1": 0}
create or replace function cerrar_caja(p_caja uuid, p_denominaciones jsonb, p_recibe text, p_obs text, p_sesion uuid, p_recep text)
returns jsonb language plpgsql as $$
declare c caja_turnos; v_res jsonb; v_contado numeric; v_esperado numeric; v_fondo numeric := cfg_num('fondo_fijo'); v_queda numeric;
begin
  select * into c from caja_turnos where id = p_caja for update;
  if not found then raise exception 'Caja no encontrada'; end if;
  if c.estado <> 'abierta' then raise exception 'Esta caja ya fue cerrada'; end if;
  select coalesce(sum(key::numeric * value::numeric), 0) into v_contado from jsonb_each_text(p_denominaciones) where value ~ '^[0-9]+$';
  v_res := resumen_caja(p_caja);
  v_esperado := (v_res->>'esperado')::numeric;
  v_queda := least(v_fondo, v_contado);
  update caja_turnos set estado = 'cerrada', cierre_en = now(), denominaciones = p_denominaciones, contado = v_contado,
    esperado = v_esperado, diferencia = v_contado - v_esperado, queda_fondo = v_queda, entregado = v_contado - v_queda,
    recibe = nullif(trim(p_recibe), ''), observaciones = nullif(trim(p_obs), ''), cerrado_por = p_recep
  where id = p_caja;
  perform auditar(p_sesion, p_recep, 'cierre_caja', 'caja', p_caja::text,
    jsonb_build_object('contado', v_contado, 'esperado', v_esperado, 'recibe', p_recibe));
  return jsonb_build_object('contado', v_contado, 'esperado', v_esperado, 'diferencia', v_contado - v_esperado,
    'queda_fondo', v_queda, 'entregado', v_contado - v_queda);
end $$;

-- ---------- Venta A&B ----------
-- p: ficha, habitacion (opcional), items [{producto_id, cantidad}], metodo, historica, fecha, sesion_id, recepcionista
create or replace function registrar_venta(p jsonb) returns uuid language plpgsql as $$
declare v_id uuid; v_total numeric := 0; it jsonb; pr productos; v_res uuid; v_hist boolean := coalesce((p->>'historica')::boolean, false);
  v_fecha timestamptz := coalesce(nullif(p->>'fecha', '')::timestamptz, now()); v_ficha text := trim(p->>'ficha');
begin
  if v_ficha is null or v_ficha !~ '^[0-9]{1,8}$' then raise exception 'Digite el número de ficha A&B (solo números)'; end if;
  if exists (select 1 from ventas_ab where ficha = v_ficha) then raise exception 'La ficha A&B % ya está registrada', v_ficha; end if;
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then raise exception 'Agregue al menos un producto'; end if;
  if nullif(p->>'habitacion', '') is not null and not v_hist then
    select id into v_res from reservas where habitacion = p->>'habitacion' and estado = 'en_casa' limit 1;
    if v_res is null then raise exception 'La % no tiene huéspedes en casa', p->>'habitacion'; end if;
  end if;
  insert into ventas_ab (ficha, habitacion, reserva_id, metodo, total, historico, fecha_operacion, sesion_id, recepcionista)
  values (v_ficha, nullif(p->>'habitacion', ''), v_res, (p->>'metodo')::metodo_t, 1, v_hist, v_fecha, (p->>'sesion_id')::uuid, p->>'recepcionista')
  returning id into v_id;
  for it in select * from jsonb_array_elements(p->'items') loop
    select * into pr from productos where id = (it->>'producto_id')::smallint and activo;
    if not found then raise exception 'Producto no disponible'; end if;
    insert into venta_items (venta_id, producto_id, nombre, cantidad, precio_unit) values (v_id, pr.id, pr.nombre, (it->>'cantidad')::smallint, pr.precio);
    v_total := v_total + pr.precio * (it->>'cantidad')::int;
  end loop;
  update ventas_ab set total = v_total where id = v_id;
  insert into movimientos (tipo, reserva_id, venta_id, concepto, metodo, importe, turno, fecha_operacion, historico, sesion_id, recepcionista)
  values ('ab', v_res, v_id,
    'A&B ' || v_ficha || ' · ' || (select string_agg(cantidad || ' ' || nombre, ', ') from venta_items where venta_id = v_id)
      || coalesce(' · ' || nullif(p->>'habitacion', ''), ''),
    (p->>'metodo')::metodo_t, v_total, turno_de(v_fecha), v_fecha, v_hist, (p->>'sesion_id')::uuid, p->>'recepcionista');
  perform auditar((p->>'sesion_id')::uuid, p->>'recepcionista', 'venta_ab', 'venta', v_id::text, jsonb_build_object('total', v_total));
  return v_id;
end $$;

create or replace function registrar_egreso(p_concepto text, p_importe numeric, p_metodo metodo_t, p_sesion uuid, p_recep text)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  if length(trim(coalesce(p_concepto, ''))) < 3 then raise exception 'Describa el egreso'; end if;
  if coalesce(p_importe, 0) <= 0 then raise exception 'El importe debe ser mayor a cero'; end if;
  insert into movimientos (tipo, concepto, metodo, importe, turno, sesion_id, recepcionista)
  values ('egreso', trim(p_concepto), p_metodo, p_importe, turno_de(now()), p_sesion, p_recep) returning id into v_id;
  perform auditar(p_sesion, p_recep, 'egreso', 'movimiento', v_id::text, jsonb_build_object('importe', p_importe, 'concepto', p_concepto));
  return v_id;
end $$;

create or replace function siguiente_ficha_ab() returns text language sql stable as $$
  select lpad((coalesce(max(ficha::bigint), 0) + 1)::text, 4, '0') from ventas_ab
$$;

-- ---------- Reporte diario ----------
create or replace function reporte_diario(p_fecha date) returns jsonb language sql stable as $$
  with m as (
    select mv.*, r.ficha as ficha_res, v.ficha as ficha_ab from movimientos mv
    left join reservas r on r.id = mv.reserva_id left join ventas_ab v on v.id = mv.venta_id
    where (mv.fecha_operacion at time zone 'America/Lima')::date = p_fecha
  ), s as (select *, case when tipo in ('alojamiento','ab') then importe else -importe end as neto from m)
  select jsonb_build_object(
    'fecha', p_fecha,
    'alojamiento', coalesce((select sum(importe) from s where tipo = 'alojamiento'), 0),
    'ab', coalesce((select sum(importe) from s where tipo = 'ab'), 0),
    'egresos', coalesce((select sum(importe) from s where tipo in ('egreso','devolucion')), 0),
    'balance', coalesce((select sum(neto) from s), 0),
    'por_metodo', jsonb_build_object(
      'efectivo', coalesce((select sum(neto) from s where metodo = 'efectivo'), 0),
      'yape', coalesce((select sum(neto) from s where metodo = 'yape'), 0),
      'tarjeta', coalesce((select sum(neto) from s where metodo = 'tarjeta'), 0)),
    'por_turno', (select coalesce(jsonb_object_agg(turno, total), '{}'::jsonb) from (select turno, sum(neto) total from s group by turno) t),
    'movimientos', coalesce((select jsonb_agg(jsonb_build_object(
        'fecha', fecha_operacion, 'turno', turno, 'tipo', tipo, 'ficha', coalesce(ficha_ab, ficha_res), 'concepto', concepto,
        'metodo', metodo, 'importe', importe, 'recepcionista', recepcionista, 'historico', historico) order by fecha_operacion) from s), '[]'::jsonb),
    'cajas', coalesce((select jsonb_agg(to_jsonb(c) order by apertura_en) from caja_turnos c
        where (c.apertura_en at time zone 'America/Lima')::date = p_fecha), '[]'::jsonb)
  )
$$;

-- ---------- Exportación de reservas con huéspedes ----------
create or replace function exportar_reservas(p_desde timestamptz, p_hasta timestamptz)
returns table (
  ficha text, habitacion text, modalidad text, entrada timestamptz, salida timestamptz, personas smallint, estado text, canal text,
  tarifa numeric, adicional numeric, total numeric, metodo text, recepcionista text,
  titular text, titular_doc_tipo text, titular_documento text, titular_nacionalidad text, titular_nacimiento date, titular_estado_civil text,
  titular_distrito text, titular_direccion text,
  acomp_nombre text, acomp_documento text, acomp_nacionalidad text, acomp_nacimiento date, acomp_estado_civil text
) language sql stable as $$
  select r.ficha, r.habitacion, r.modalidad::text, r.entrada, r.salida, r.personas, r.estado::text, r.canal::text,
    r.tarifa_base, r.adicional, r.total,
    (select string_agg(distinct m.metodo::text, ' + ') from movimientos m where m.reserva_id = r.id and m.tipo = 'alojamiento'),
    r.recepcionista,
    coalesce(t.apellidos_nombres, r.titular), t.documento_tipo::text, coalesce(t.documento, r.documento), t.nacionalidad, t.fecha_nacimiento, t.estado_civil,
    t.distrito, t.direccion,
    a.apellidos_nombres, a.documento, a.nacionalidad, a.fecha_nacimiento, a.estado_civil
  from reservas r
  left join reserva_huespedes rt on rt.reserva_id = r.id and rt.es_titular left join huespedes t on t.id = rt.huesped_id
  left join lateral (select h.* from reserva_huespedes ra join huespedes h on h.id = ra.huesped_id
                     where ra.reserva_id = r.id and not ra.es_titular limit 1) a on true
  where r.entrada >= p_desde and r.entrada < p_hasta
  order by r.entrada
$$;

do $$
declare t text;
begin
  foreach t in array array['caja_turnos','ventas_ab','venta_items'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (true) with check (true)', t || '_recepcion', t);
  end loop;
end $$;

-- =====================================================================
-- Hito 2 · Habitaciones y reservas
-- Reservas con pago total, sin cruces de horario, regla de limpieza
-- entre estadías, fichas digitadas y carga de reservas pasadas.
-- =====================================================================

create type modalidad_t as enum ('noche', 'promo5h');
create type estado_res_t as enum ('confirmada', 'en_casa', 'finalizada', 'cancelada');
create type canal_t as enum ('recepcion', 'whatsapp', 'telefono', 'booking');
create type metodo_t as enum ('efectivo', 'yape', 'tarjeta');
create type mov_t as enum ('alojamiento', 'ab', 'egreso', 'devolucion');

-- ---------- Reservas ----------
create table reservas (
  id uuid primary key default gen_random_uuid(),
  ficha text not null unique check (ficha ~ '^[0-9]{1,8}$'),
  habitacion text not null references habitaciones(numero),
  modalidad modalidad_t not null,
  entrada timestamptz not null,
  salida timestamptz not null,
  personas smallint not null check (personas between 1 and 6),
  titular text not null check (length(trim(titular)) >= 3),
  documento text,
  canal canal_t not null default 'recepcion',
  tarifa_base numeric(10,2) not null,
  adicional numeric(10,2) not null default 0,
  total numeric(10,2) not null check (total > 0),
  estado estado_res_t not null default 'confirmada',
  historica boolean not null default false,
  checkin_en timestamptz,
  checkout_en timestamptz,
  motivo_cancelacion text,
  sesion_id uuid references sesiones(id),
  recepcionista text,
  creado_en timestamptz not null default now(),
  check (salida > entrada),
  -- Una misma habitación física nunca tiene dos estadías superpuestas,
  -- aunque se guarden al mismo tiempo desde dos pestañas.
  constraint reservas_sin_cruce exclude using gist (
    habitacion with =,
    tstzrange(entrada, salida, '[)') with &&
  ) where (estado <> 'cancelada')
);
create index reservas_entrada_idx on reservas (entrada);
create index reservas_salida_idx on reservas (salida);

-- ---------- Movimientos de dinero ----------
-- Todo cobro, egreso o devolución. El importe siempre es positivo;
-- el tipo indica si suma (alojamiento, ab) o resta (egreso, devolucion).
create table movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo mov_t not null,
  reserva_id uuid references reservas(id),
  concepto text not null,
  metodo metodo_t not null,
  importe numeric(10,2) not null check (importe > 0),
  turno turno_t not null,
  fecha_operacion timestamptz not null default now(),
  historico boolean not null default false,
  sesion_id uuid references sesiones(id),
  recepcionista text,
  creado_en timestamptz not null default now()
);
create index movimientos_fecha_idx on movimientos (fecha_operacion);

-- ---------- Cotización ----------
-- Fuente única del precio. El frontend la replica solo para mostrar.
create or replace function cotizar(
  p_habitacion text, p_modalidad modalidad_t, p_entrada timestamptz, p_noches int, p_personas int
) returns jsonb language plpgsql stable as $$
declare
  c categorias;
  v_dow int := extract(isodow from p_entrada at time zone 'America/Lima');
  v_extra int;
  v_adicional numeric := cfg_num('adicional_persona');
  v_base numeric;
  v_salida timestamptz;
  v_dias jsonb := (select valor from config where clave = 'promo_dias_iso');
begin
  select cat.* into c from habitaciones h join categorias cat on cat.id = h.categoria_id where h.numero = p_habitacion;
  if not found then raise exception 'La habitación % no existe', p_habitacion; end if;
  if p_personas > c.capacidad_max then
    raise exception 'La % admite como máximo % personas', p_habitacion, c.capacidad_max;
  end if;
  v_extra := greatest(p_personas - c.capacidad_base, 0);

  if p_modalidad = 'promo5h' then
    if c.precio_promo is null then raise exception 'La promo de 5 horas no aplica a la categoría %', c.nombre; end if;
    if not (v_dias @> to_jsonb(v_dow)) then raise exception 'La promo de 5 horas solo aplica de lunes a jueves'; end if;
    v_base := c.precio_promo;
    v_salida := p_entrada + make_interval(hours => cfg_num('promo_horas')::int);
    return jsonb_build_object('tarifa_base', v_base, 'adicional', v_extra * v_adicional,
      'total', v_base + v_extra * v_adicional, 'salida', v_salida, 'noches', 0);
  end if;

  if coalesce(p_noches, 0) < 1 then raise exception 'Indique al menos una noche'; end if;
  v_base := c.precio_noche * p_noches;
  -- Salida a las 12:00 de Lima, p_noches días después de la fecha de entrada.
  v_salida := (((p_entrada at time zone 'America/Lima')::date + p_noches)::timestamp
               + (select (valor #>> '{}')::time from config where clave = 'hora_checkout')) at time zone 'America/Lima';
  return jsonb_build_object('tarifa_base', v_base, 'adicional', v_extra * v_adicional * p_noches,
    'total', v_base + v_extra * v_adicional * p_noches, 'salida', v_salida, 'noches', p_noches);
end $$;

-- ---------- Regla de limpieza entre estadías ----------
-- Una habitación no se vuelve a vender el mismo día de una salida:
-- normalmente se limpia en la mañana siguiente. Devuelve la salida previa
-- que genera el conflicto, o null si no hay.
create or replace function conflicto_limpieza(p_habitacion text, p_entrada timestamptz, p_excluir uuid default null)
returns timestamptz language sql stable as $$
  select max(r.salida) from reservas r
  where r.habitacion = p_habitacion and r.estado <> 'cancelada'
    and (p_excluir is null or r.id <> p_excluir)
    and r.salida <= p_entrada
    and (r.salida at time zone 'America/Lima')::date = (p_entrada at time zone 'America/Lima')::date
$$;

create or replace function auditar(p_sesion uuid, p_recep text, p_accion text, p_entidad text, p_id text, p_detalle jsonb default '{}')
returns void language sql as $$
  insert into auditoria (sesion_id, recepcionista, accion, entidad, entidad_id, detalle)
  values (p_sesion, p_recep, p_accion, p_entidad, p_id, coalesce(p_detalle, '{}'::jsonb))
$$;

-- ---------- Crear reserva (con pago total) ----------
-- p: habitacion, modalidad, entrada, noches, personas, titular, documento,
--    canal, ficha, metodo, historica, forzar_limpieza, sesion_id, recepcionista
create or replace function crear_reserva(p jsonb) returns uuid language plpgsql as $$
declare
  v_id uuid;
  v_hab habitaciones;
  v_entrada timestamptz := (p->>'entrada')::timestamptz;
  v_hist boolean := coalesce((p->>'historica')::boolean, false);
  v_cot jsonb;
  v_salida timestamptz;
  v_conf timestamptz;
  v_ficha text := trim(p->>'ficha');
begin
  if v_ficha is null or v_ficha !~ '^[0-9]{1,8}$' then raise exception 'Digite el número de ficha (solo números)'; end if;
  if exists (select 1 from reservas where ficha = v_ficha) then raise exception 'La ficha % ya está registrada', v_ficha; end if;

  select * into v_hab from habitaciones where numero = p->>'habitacion' for update;
  if not found then raise exception 'La habitación % no existe', p->>'habitacion'; end if;

  v_cot := cotizar(v_hab.numero, (p->>'modalidad')::modalidad_t, v_entrada, (p->>'noches')::int, (p->>'personas')::int);
  v_salida := (v_cot->>'salida')::timestamptz;

  if v_hist then
    if v_salida > now() then raise exception 'Una reserva pasada debe haber terminado antes de hoy'; end if;
  else
    if v_salida <= now() then raise exception 'La salida ya pasó. Para cargar estadías anteriores marque «Reserva pasada»'; end if;
    if v_hab.estado = 'fuera_servicio' then
      raise exception 'La % está fuera de servicio (%). Habilítela antes de asignarla', v_hab.numero, v_hab.motivo_fuera;
    end if;
    v_conf := conflicto_limpieza(v_hab.numero, v_entrada);
    if v_conf is not null and not coalesce((p->>'forzar_limpieza')::boolean, false) then
      raise exception 'LIMPIEZA: La % tiene una salida a las % del mismo día y estará pendiente de limpieza',
        v_hab.numero, to_char(v_conf at time zone 'America/Lima', 'HH24:MI');
    end if;
  end if;

  insert into reservas (ficha, habitacion, modalidad, entrada, salida, personas, titular, documento, canal,
                        tarifa_base, adicional, total, estado, historica, checkin_en, checkout_en, sesion_id, recepcionista)
  values (v_ficha, v_hab.numero, (p->>'modalidad')::modalidad_t, v_entrada, v_salida, (p->>'personas')::int,
          trim(p->>'titular'), nullif(trim(p->>'documento'), ''), coalesce((p->>'canal')::canal_t, 'recepcion'),
          (v_cot->>'tarifa_base')::numeric, (v_cot->>'adicional')::numeric, (v_cot->>'total')::numeric,
          case when v_hist then 'finalizada'::estado_res_t else 'confirmada'::estado_res_t end,
          v_hist, case when v_hist then v_entrada end, case when v_hist then v_salida end,
          (p->>'sesion_id')::uuid, p->>'recepcionista')
  returning id into v_id;

  -- El huésped siempre paga la estadía completa al registrar.
  insert into movimientos (tipo, reserva_id, concepto, metodo, importe, turno, fecha_operacion, historico, sesion_id, recepcionista)
  values ('alojamiento', v_id,
          format('Reserva %s · %s · %s', v_ficha, v_hab.numero, trim(p->>'titular')),
          (p->>'metodo')::metodo_t, (v_cot->>'total')::numeric,
          turno_de(case when v_hist then v_entrada else now() end),
          case when v_hist then v_entrada else now() end, v_hist,
          (p->>'sesion_id')::uuid, p->>'recepcionista');

  perform auditar((p->>'sesion_id')::uuid, p->>'recepcionista', case when v_hist then 'reserva_pasada' else 'reserva' end,
                  'reserva', v_id::text, p - 'sesion_id');
  return v_id;
exception
  when exclusion_violation then
    raise exception 'La % ya tiene una estadía en ese horario', p->>'habitacion';
end $$;

-- ---------- Cancelar ----------
create or replace function cancelar_reserva(p_id uuid, p_motivo text, p_devolver boolean, p_metodo metodo_t,
  p_sesion uuid, p_recep text) returns void language plpgsql as $$
declare r reservas; v_pagado numeric;
begin
  select * into r from reservas where id = p_id for update;
  if not found then raise exception 'Reserva no encontrada'; end if;
  if r.estado <> 'confirmada' then raise exception 'Solo se cancelan reservas que aún no ingresan'; end if;
  if length(trim(coalesce(p_motivo, ''))) < 3 then raise exception 'Indique el motivo de la cancelación'; end if;
  update reservas set estado = 'cancelada', motivo_cancelacion = trim(p_motivo) where id = p_id;
  if p_devolver then
    select coalesce(sum(case when tipo = 'devolucion' then -importe else importe end), 0) into v_pagado
    from movimientos where reserva_id = p_id;
    if v_pagado > 0 then
      insert into movimientos (tipo, reserva_id, concepto, metodo, importe, turno, sesion_id, recepcionista)
      values ('devolucion', p_id, format('Devolución reserva %s', r.ficha), p_metodo, v_pagado, turno_de(now()), p_sesion, p_recep);
    end if;
  end if;
  perform auditar(p_sesion, p_recep, 'cancelacion', 'reserva', p_id::text, jsonb_build_object('motivo', p_motivo, 'devolver', p_devolver));
end $$;

-- ---------- Reprogramar o reasignar ----------
-- Recalcula el precio. Si sube, cobra la diferencia; si baja, la devuelve.
create or replace function reprogramar_reserva(p_id uuid, p_habitacion text, p_entrada timestamptz, p_noches int,
  p_personas int, p_metodo metodo_t, p_forzar_limpieza boolean, p_sesion uuid, p_recep text)
returns void language plpgsql as $$
declare r reservas; v_cot jsonb; v_dif numeric; v_conf timestamptz;
begin
  select * into r from reservas where id = p_id for update;
  if not found then raise exception 'Reserva no encontrada'; end if;
  if r.estado <> 'confirmada' then raise exception 'Solo se reprograman reservas que aún no ingresan'; end if;
  if (select estado from habitaciones where numero = p_habitacion) = 'fuera_servicio' then
    raise exception 'La % está fuera de servicio', p_habitacion;
  end if;
  v_cot := cotizar(p_habitacion, r.modalidad, p_entrada, p_noches, p_personas);
  v_conf := conflicto_limpieza(p_habitacion, p_entrada, p_id);
  if v_conf is not null and not coalesce(p_forzar_limpieza, false) then
    raise exception 'LIMPIEZA: La % tiene una salida a las % del mismo día y estará pendiente de limpieza',
      p_habitacion, to_char(v_conf at time zone 'America/Lima', 'HH24:MI');
  end if;
  update reservas set habitacion = p_habitacion, entrada = p_entrada, salida = (v_cot->>'salida')::timestamptz,
    personas = p_personas, tarifa_base = (v_cot->>'tarifa_base')::numeric, adicional = (v_cot->>'adicional')::numeric,
    total = (v_cot->>'total')::numeric where id = p_id;
  v_dif := (v_cot->>'total')::numeric - r.total;
  if v_dif <> 0 then
    insert into movimientos (tipo, reserva_id, concepto, metodo, importe, turno, sesion_id, recepcionista)
    values (case when v_dif > 0 then 'alojamiento'::mov_t else 'devolucion'::mov_t end, p_id,
            format('Diferencia por cambio · reserva %s', r.ficha), p_metodo, abs(v_dif), turno_de(now()), p_sesion, p_recep);
  end if;
  perform auditar(p_sesion, p_recep, 'reprogramacion', 'reserva', p_id::text,
    jsonb_build_object('antes', jsonb_build_object('habitacion', r.habitacion, 'entrada', r.entrada, 'total', r.total), 'despues', v_cot));
exception
  when exclusion_violation then
    raise exception 'La % ya tiene una estadía en ese horario', p_habitacion;
end $$;

-- ---------- Estado de habitaciones ----------
-- «Ocupada» solo se asigna con el check-in; la salida deja la habitación sucia.
create or replace function cambiar_estado_habitacion(p_numero text, p_estado estado_hab_t, p_motivo text,
  p_sesion uuid, p_recep text) returns void language plpgsql as $$
declare h habitaciones;
begin
  select * into h from habitaciones where numero = p_numero for update;
  if not found then raise exception 'La habitación % no existe', p_numero; end if;
  if h.estado = p_estado then return; end if;
  if p_estado = 'ocupada' then raise exception 'Una habitación pasa a ocupada solo con el check-in'; end if;
  if h.estado = 'ocupada' then raise exception 'La % está ocupada. Registre primero la salida del huésped', p_numero; end if;
  if p_estado = 'fuera_servicio' and length(trim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Indique el motivo para marcarla fuera de servicio';
  end if;
  update habitaciones set estado = p_estado,
    motivo_fuera = case when p_estado = 'fuera_servicio' then trim(p_motivo) end,
    actualizado_en = now() where numero = p_numero;
  perform auditar(p_sesion, p_recep, 'estado_habitacion', 'habitacion', p_numero,
    jsonb_build_object('de', h.estado, 'a', p_estado, 'motivo', p_motivo));
end $$;

-- Sugerencia de la siguiente ficha. Recepción puede digitar otra.
create or replace function siguiente_ficha_alojamiento() returns text language sql stable as $$
  select lpad((coalesce(max(ficha::bigint), 0) + 1)::text, 3, '0') from reservas
$$;

-- Historial de cambios de estado de una habitación.
create or replace function historial_habitacion(p_numero text, p_limite int default 10)
returns table (ts timestamptz, recepcionista text, de text, a text, motivo text) language sql stable as $$
  select ts, recepcionista, detalle->>'de', detalle->>'a', detalle->>'motivo' from auditoria
  where entidad = 'habitacion' and entidad_id = p_numero order by ts desc limit p_limite
$$;

do $$
declare t text;
begin
  foreach t in array array['reservas','movimientos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (true) with check (true)', t || '_recepcion', t);
  end loop;
end $$;

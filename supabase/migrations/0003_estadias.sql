-- =====================================================================
-- Hito 3 · Check-in y check-out
-- Ficha de huéspedes (réplica de la ficha de papel) con autocompletado
-- por documento, check-in en un paso y check-out en un paso.
-- =====================================================================

create type doc_t as enum ('DNI', 'CE', 'PASAPORTE');

create table huespedes (
  id uuid primary key default gen_random_uuid(),
  documento_tipo doc_t not null default 'DNI',
  documento text not null,
  apellidos_nombres text not null check (length(trim(apellidos_nombres)) >= 3),
  nacionalidad text not null default 'Peruana',
  fecha_nacimiento date,
  estado_civil text,
  distrito text,
  direccion text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (documento_tipo, documento),
  check (documento_tipo <> 'DNI' or documento ~ '^[0-9]{8}$')
);

-- Huéspedes de cada estadía (la ficha contempla titular y acompañante).
create table reserva_huespedes (
  reserva_id uuid not null references reservas(id) on delete cascade,
  huesped_id uuid not null references huespedes(id),
  es_titular boolean not null default false,
  primary key (reserva_id, huesped_id)
);
create unique index reserva_un_titular on reserva_huespedes (reserva_id) where es_titular;

-- Busca un huésped que ya se hospedó, para completar la ficha.
create or replace function buscar_huesped(p_documento text)
returns setof huespedes language sql stable as $$
  select * from huespedes where documento = upper(trim(p_documento)) order by actualizado_en desc limit 1
$$;

create or replace function upsert_huesped(h jsonb) returns uuid language plpgsql as $$
declare v_id uuid; v_tipo doc_t := coalesce((h->>'documento_tipo')::doc_t, 'DNI'); v_doc text := upper(trim(h->>'documento'));
begin
  if v_doc is null or v_doc = '' then raise exception 'Falta el documento del huésped'; end if;
  if v_tipo = 'DNI' and v_doc !~ '^[0-9]{8}$' then raise exception 'El DNI % debe tener 8 dígitos', v_doc; end if;
  insert into huespedes (documento_tipo, documento, apellidos_nombres, nacionalidad, fecha_nacimiento, estado_civil, distrito, direccion)
  values (v_tipo, v_doc, trim(h->>'apellidos_nombres'), coalesce(nullif(trim(h->>'nacionalidad'), ''), 'Peruana'),
          nullif(h->>'fecha_nacimiento', '')::date, nullif(trim(h->>'estado_civil'), ''), nullif(trim(h->>'distrito'), ''), nullif(trim(h->>'direccion'), ''))
  on conflict (documento_tipo, documento) do update set
    apellidos_nombres = excluded.apellidos_nombres, nacionalidad = excluded.nacionalidad,
    fecha_nacimiento = coalesce(excluded.fecha_nacimiento, huespedes.fecha_nacimiento),
    estado_civil = coalesce(excluded.estado_civil, huespedes.estado_civil),
    distrito = coalesce(excluded.distrito, huespedes.distrito),
    direccion = coalesce(excluded.direccion, huespedes.direccion),
    actualizado_en = now()
  returning id into v_id;
  return v_id;
end $$;

-- ---------- Check-in ----------
-- p: reserva_id, titular {…}, acompanante {…} opcional, sesion_id, recepcionista
create or replace function hacer_checkin(p jsonb) returns void language plpgsql as $$
declare r reservas; h habitaciones; v_tit uuid; v_acomp uuid;
begin
  select * into r from reservas where id = (p->>'reserva_id')::uuid for update;
  if not found then raise exception 'Reserva no encontrada'; end if;
  if r.estado <> 'confirmada' then raise exception 'La reserva ya no está pendiente de ingreso'; end if;
  if (r.entrada at time zone 'America/Lima')::date > (now() at time zone 'America/Lima')::date then
    raise exception 'La entrada es el %. El check-in se hace el mismo día', to_char(r.entrada at time zone 'America/Lima', 'DD/MM');
  end if;
  if r.salida <= now() then raise exception 'La estadía ya terminó; regístrela como reserva pasada'; end if;

  select * into h from habitaciones where numero = r.habitacion for update;
  if h.estado <> 'limpia' then
    raise exception 'La % está %. Debe estar limpia para el ingreso', h.numero, replace(h.estado::text, '_', ' ');
  end if;

  v_tit := upsert_huesped(p->'titular');
  insert into reserva_huespedes (reserva_id, huesped_id, es_titular) values (r.id, v_tit, true)
    on conflict (reserva_id, huesped_id) do update set es_titular = true;
  if p ? 'acompanante' and jsonb_typeof(p->'acompanante') = 'object' and coalesce(p->'acompanante'->>'documento', '') <> '' then
    v_acomp := upsert_huesped(p->'acompanante');
    if v_acomp = v_tit then raise exception 'El acompañante no puede tener el mismo documento que el titular'; end if;
    insert into reserva_huespedes (reserva_id, huesped_id, es_titular) values (r.id, v_acomp, false) on conflict do nothing;
  end if;

  update reservas set estado = 'en_casa', checkin_en = now(),
    titular = trim(p->'titular'->>'apellidos_nombres'), documento = upper(trim(p->'titular'->>'documento'))
  where id = r.id;
  update habitaciones set estado = 'ocupada', motivo_fuera = null, actualizado_en = now() where numero = r.habitacion;

  perform auditar((p->>'sesion_id')::uuid, p->>'recepcionista', 'checkin', 'reserva', r.id::text, jsonb_build_object('habitacion', r.habitacion));
  perform auditar((p->>'sesion_id')::uuid, p->>'recepcionista', 'estado_habitacion', 'habitacion', r.habitacion,
    jsonb_build_object('de', 'limpia', 'a', 'ocupada', 'motivo', 'Check-in ficha ' || r.ficha));
end $$;

-- ---------- Check-out ----------
create or replace function hacer_checkout(p_reserva uuid, p_sesion uuid, p_recep text) returns void language plpgsql as $$
declare r reservas;
begin
  select * into r from reservas where id = p_reserva for update;
  if not found then raise exception 'Reserva no encontrada'; end if;
  if r.estado <> 'en_casa' then raise exception 'La reserva no tiene huéspedes en casa'; end if;
  update reservas set estado = 'finalizada', checkout_en = now(),
    -- Una salida anticipada libera el horario restante para nuevas reservas.
    salida = least(salida, greatest(now(), entrada + interval '1 minute'))
  where id = r.id;
  update habitaciones set estado = 'sucia', actualizado_en = now() where numero = r.habitacion;
  perform auditar(p_sesion, p_recep, 'checkout', 'reserva', r.id::text, jsonb_build_object('habitacion', r.habitacion));
  perform auditar(p_sesion, p_recep, 'estado_habitacion', 'habitacion', r.habitacion,
    jsonb_build_object('de', 'ocupada', 'a', 'sucia', 'motivo', 'Check-out ficha ' || r.ficha));
end $$;

-- Huéspedes registrados en una reserva.
create or replace function huespedes_de_reserva(p_reserva uuid)
returns table (es_titular boolean, huesped jsonb) language sql stable as $$
  select rh.es_titular, to_jsonb(h) from reserva_huespedes rh join huespedes h on h.id = rh.huesped_id
  where rh.reserva_id = p_reserva order by rh.es_titular desc
$$;

do $$
declare t text;
begin
  foreach t in array array['huespedes','reserva_huespedes'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (true) with check (true)', t || '_recepcion', t);
  end loop;
end $$;

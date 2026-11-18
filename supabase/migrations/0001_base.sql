-- =====================================================================
-- Sunset Mar · Panel de recepción
-- Hito 1 · Base: catálogo de habitaciones, tarifas, productos,
-- sesiones de turno y auditoría.
-- Ejecutar en Supabase > SQL Editor, en orden numérico.
-- =====================================================================

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type turno_t as enum ('noche', 'manana', 'tarde');
create type estado_hab_t as enum ('limpia', 'ocupada', 'sucia', 'en_limpieza', 'fuera_servicio');

-- ---------- Configuración general ----------
create table config (
  clave text primary key,
  valor jsonb not null,
  descripcion text
);

insert into config (clave, valor, descripcion) values
  ('adicional_persona', '40', 'Soles por cada persona sobre la capacidad base, en cualquier habitación y modalidad'),
  ('hora_checkin', '"13:00"', 'Hora de entrada por noche'),
  ('hora_checkout', '"12:00"', 'Hora de salida por noche (mediodía)'),
  ('promo_horas', '5', 'Duración de la promoción por horas'),
  ('promo_dias_iso', '[1,2,3,4]', 'Días ISO en que aplica la promo (1 = lunes … 4 = jueves)'),
  ('fondo_fijo', '140', 'Fondo fijo de caja en soles'),
  ('zona_horaria', '"America/Lima"', 'Zona horaria operativa');

-- ---------- Categorías y tarifas ----------
create table categorias (
  id smallint generated always as identity primary key,
  nombre text not null unique,
  precio_noche numeric(10,2) not null check (precio_noche > 0),
  precio_promo numeric(10,2) check (precio_promo is null or precio_promo > 0),
  capacidad_base smallint not null default 2,
  capacidad_max smallint not null default 3,
  orden smallint not null default 0,
  check (capacidad_max >= capacidad_base)
);

insert into categorias (nombre, precio_noche, precio_promo, capacidad_base, capacidad_max, orden) values
  ('Matrimonial sin vista',               119, 99, 2, 3, 1),
  ('Matrimonial con vista parcial',       119, 99, 2, 3, 2),
  ('Matrimonial con vista frontal',       129, 99, 2, 3, 3),
  ('Matrimonial moderna con vista frontal',159, null, 2, 3, 4),
  ('Doble / triple',                      159, null, 2, 3, 5),
  ('Triple',                              199, null, 3, 4, 6),
  ('Junior Suite sin jacuzzi',            159, null, 2, 3, 7),
  ('Suite con jacuzzi y frigobar',        179, null, 2, 3, 8),
  ('Suite con jacuzzi y frigobar · 508',  189, null, 2, 3, 9),
  ('Senior Suite con jacuzzi',            199, null, 2, 3, 10),
  ('Departamento',                        250, null, 2, 4, 11);

-- ---------- Habitaciones ----------
create table habitaciones (
  numero text primary key check (numero ~ '^[2-5][0-9]{2}$'),
  piso smallint not null check (piso between 2 and 5),
  categoria_id smallint not null references categorias(id),
  estado estado_hab_t not null default 'limpia',
  motivo_fuera text,
  actualizado_en timestamptz not null default now(),
  check (estado <> 'fuera_servicio' or motivo_fuera is not null)
);

insert into habitaciones (numero, piso, categoria_id)
select h.numero, left(h.numero, 1)::smallint, c.id
from (values
  ('211','Matrimonial sin vista'), ('311','Matrimonial sin vista'), ('409','Matrimonial sin vista'), ('509','Matrimonial sin vista'),
  ('301','Matrimonial con vista parcial'), ('302','Matrimonial con vista parcial'),
  ('201','Matrimonial con vista frontal'), ('304','Matrimonial con vista frontal'), ('305','Matrimonial con vista frontal'),
  ('306','Matrimonial con vista frontal'), ('307','Matrimonial con vista frontal'), ('308','Matrimonial con vista frontal'),
  ('309','Matrimonial con vista frontal'), ('310','Matrimonial con vista frontal'), ('403','Matrimonial con vista frontal'),
  ('404','Matrimonial con vista frontal'), ('405','Matrimonial con vista frontal'), ('406','Matrimonial con vista frontal'),
  ('503','Matrimonial con vista frontal'), ('504','Matrimonial con vista frontal'), ('505','Matrimonial con vista frontal'),
  ('506','Matrimonial con vista frontal'),
  ('205','Matrimonial moderna con vista frontal'), ('206','Matrimonial moderna con vista frontal'), ('207','Matrimonial moderna con vista frontal'),
  ('303','Doble / triple'), ('407','Doble / triple'),
  ('300','Triple'),
  ('402','Junior Suite sin jacuzzi'),
  ('408','Suite con jacuzzi y frigobar'), ('507','Suite con jacuzzi y frigobar'),
  ('508','Suite con jacuzzi y frigobar · 508'),
  ('502','Senior Suite con jacuzzi'),
  ('203','Departamento'), ('208','Departamento')
) as h(numero, categoria)
join categorias c on c.nombre = h.categoria;

-- ---------- Catálogo A&B y otros productos ----------
create table productos (
  id smallint generated always as identity primary key,
  grupo text not null check (grupo in ('Bebidas', 'Otros')),
  nombre text not null unique,
  precio numeric(10,2) not null check (precio > 0),
  activo boolean not null default true,
  orden smallint not null default 0
);

insert into productos (grupo, nombre, precio, orden) values
  ('Bebidas', 'Pilsen botella', 9.00, 1),
  ('Bebidas', 'Vino tinto', 42.00, 2),
  ('Bebidas', 'Vino blanco', 42.00, 3),
  ('Bebidas', 'Vino rosé', 42.00, 4),
  ('Bebidas', 'Vino Queirolo', 38.00, 5),
  ('Bebidas', 'Vino Tabernero Borgoña', 38.00, 6),
  ('Bebidas', 'Champagne', 42.00, 7),
  ('Bebidas', 'Inca Kola', 5.50, 8),
  ('Bebidas', 'Coca-Cola', 5.50, 9),
  ('Bebidas', 'Agua San Luis', 4.00, 10),
  ('Bebidas', 'Sportade', 5.50, 11),
  ('Otros', 'Cepillo', 6.00, 20),
  ('Otros', 'Shampoo', 3.50, 21),
  ('Otros', 'Toalla higiénica', 1.50, 22),
  ('Otros', 'Preservativos', 13.50, 23),
  ('Otros', 'Crema dental', 7.50, 24);

-- ---------- Sesiones de turno ----------
-- Recepción usa una sola cuenta. Cada ingreso registra el turno
-- y el nombre de quien atiende, para trazar cobros y cierres.
create table sesiones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  turno turno_t not null,
  recepcionista text not null check (length(trim(recepcionista)) between 2 and 80),
  inicio timestamptz not null default now(),
  fin timestamptz
);

-- ---------- Auditoría ----------
create table auditoria (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  sesion_id uuid references sesiones(id),
  recepcionista text,
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb not null default '{}'::jsonb
);
create index auditoria_ts_idx on auditoria (ts desc);

-- ---------- Funciones utilitarias ----------
-- Turno operativo de un instante. Desde las 14:00 los cobros pertenecen a la tarde.
create or replace function turno_de(p_ts timestamptz)
returns turno_t language sql stable as $$
  select case
    when extract(hour from p_ts at time zone 'America/Lima') >= 22
      or extract(hour from p_ts at time zone 'America/Lima') < 8 then 'noche'::turno_t
    when extract(hour from p_ts at time zone 'America/Lima') < 14 then 'manana'::turno_t
    else 'tarde'::turno_t
  end
$$;

create or replace function cfg_num(p_clave text)
returns numeric language sql stable as $$ select (valor #>> '{}')::numeric from config where clave = p_clave $$;

-- Registra la sesión de turno al ingresar.
create or replace function abrir_sesion(p_turno turno_t, p_recepcionista text)
returns uuid language plpgsql security invoker as $$
declare v_id uuid;
begin
  insert into sesiones (turno, recepcionista) values (p_turno, trim(p_recepcionista)) returning id into v_id;
  insert into auditoria (sesion_id, recepcionista, accion, entidad, entidad_id)
  values (v_id, trim(p_recepcionista), 'ingreso', 'sesion', v_id::text);
  return v_id;
end $$;

create or replace function cerrar_sesion(p_sesion uuid)
returns void language sql security invoker as $$
  update sesiones set fin = now() where id = p_sesion and fin is null
$$;

-- Nombres usados antes, para sugerirlos en el login.
create or replace function recepcionistas_recientes()
returns setof text language sql stable as $$
  select recepcionista from sesiones group by recepcionista order by max(inicio) desc limit 8
$$;

-- ---------- Seguridad (RLS) ----------
-- Solo la cuenta autenticada de recepción accede a los datos.
do $$
declare t text;
begin
  foreach t in array array['config','categorias','habitaciones','productos','sesiones','auditoria'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (true) with check (true)', t || '_recepcion', t);
  end loop;
end $$;

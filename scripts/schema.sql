-- Reestructuración: solo Calificaciones, Organigrama y Empleados (solo lectura).
-- Ejecutar completo en Supabase Dashboard -> SQL Editor -> Run.
-- Borra las tablas del viejo módulo de Puestos/Capacitaciones y las 3 tablas
-- de historial de capacitaciones que competían entre sí; deja empleados y
-- organigrama intactos y crea la tabla nueva de calificaciones (1 fila por empleado).

drop table if exists matriz_puesto cascade;
drop table if exists calificaciones cascade;
drop table if exists matriz_empleado cascade;
drop table if exists asignaciones_cap cascade;
drop table if exists calificaciones_empleado cascade;
drop table if exists capacitaciones cascade;
drop table if exists cursos cascade;
drop table if exists puestos cascade;

alter table empleados drop column if exists puesto_id;
alter table empleados add column if not exists fec_cambio_puesto date;

create table calificaciones (
  id uuid primary key default gen_random_uuid(),
  emp_clave text not null unique references empleados(clave) on delete cascade,
  cierre_matriz date,
  fecha_entrega_90dias date,
  fecha_real_90dias date,
  entrega_2025 date,
  fecha_real_2025 date,
  entrega_2026 date,
  fecha_real_2026 date,
  entrega_2027 date,
  fecha_real_2027 date,
  observaciones text,
  rh text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calificaciones_emp_clave_idx on calificaciones(emp_clave);

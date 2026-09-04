-- La tabla calificaciones quedó con Row Level Security activado por defecto,
-- lo que bloqueaba todas las lecturas/escrituras desde la app (que usa la
-- anon key, igual que empleados/organigrama, que no tienen este bloqueo).
alter table calificaciones disable row level security;

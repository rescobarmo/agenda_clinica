-- Políticas de Row-Level Security (RLS) para aislamiento multi-tenant.
-- Aplicar después de `prisma migrate deploy` (o integrar como migración manual).
-- El backend establece las variables con set_config() dentro de cada transacción:
--   app.current_clinica_id  -> ID de la clínica activa
--   app.current_user_id     -> ID del usuario autenticado

-- Habilitar RLS en las tablas con datos por clínica.
ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueos_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditorias ENABLE ROW LEVEL SECURITY;

-- Política genérica: solo filas de la clínica activa.
CREATE POLICY tenant_isolation ON sucursales
  FOR ALL USING (clinica_id = current_setting('app.current_clinica_id', true));

CREATE POLICY tenant_isolation ON citas
  FOR ALL USING (clinica_id = current_setting('app.current_clinica_id', true));

CREATE POLICY tenant_isolation ON pacientes
  FOR ALL USING (clinica_id = current_setting('app.current_clinica_id', true));

CREATE POLICY tenant_isolation ON medicos
  FOR ALL USING (clinica_id = current_setting('app.current_clinica_id', true));

-- Super admin (sin clinica_id) omite RLS.
CREATE POLICY super_admin_bypass ON clinicas
  FOR ALL USING (current_setting('app.current_clinica_id', true) IS NULL OR current_setting('app.current_clinica_id', true) = '');

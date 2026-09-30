-- Políticas de Row-Level Security (RLS) para aislamiento multi-tenant.
-- Idempotente: puede ejecutarse varias veces sin error.
-- Variables de sesión fijadas por el TenantMiddleware dentro de cada transacción:
--   app.current_clinica_id  -> ID de la clínica activa
--   app.current_user_id     -> ID del usuario autenticado
--
-- Se usa FORCE ROW LEVEL SECURITY para que aplique también al rol dueño de las tablas.
-- Si el GUC está vacío/NULL (por ejemplo un SUPER_ADMIN o tareas internas) se permite todo.

-- ── Habilitar RLS + FORCE ────────────────────────────────────────────────────
ALTER TABLE tenants_clinica          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants_clinica          FORCE ROW LEVEL SECURITY;
ALTER TABLE tenants_sucursal         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants_sucursal         FORCE ROW LEVEL SECURITY;
ALTER TABLE tenants_consultorio      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants_consultorio      FORCE ROW LEVEL SECURITY;
ALTER TABLE accounts_user            ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_user            FORCE ROW LEVEL SECURITY;
ALTER TABLE scheduling_medico        ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_medico        FORCE ROW LEVEL SECURITY;
ALTER TABLE scheduling_paciente      ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_paciente      FORCE ROW LEVEL SECURITY;
ALTER TABLE scheduling_disponibilidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_disponibilidad FORCE ROW LEVEL SECURITY;
ALTER TABLE scheduling_bloqueoagenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_bloqueoagenda FORCE ROW LEVEL SECURITY;
ALTER TABLE scheduling_cita          ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_cita          FORCE ROW LEVEL SECURITY;
ALTER TABLE scheduling_fichaclinica  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_fichaclinica  FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications_notificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_notificacion FORCE ROW LEVEL SECURITY;

-- ── Políticas por clinica_id directo ─────────────────────────────────────────
DROP POLICY IF EXISTS tenant_isolation ON tenants_sucursal;
CREATE POLICY tenant_isolation ON tenants_sucursal
  FOR ALL USING (
    current_setting('app.current_clinica_id', true) IS NULL
    OR current_setting('app.current_clinica_id', true) = ''
    OR clinica_id = current_setting('app.current_clinica_id', true)
  );

DROP POLICY IF EXISTS tenant_isolation ON scheduling_medico;
CREATE POLICY tenant_isolation ON scheduling_medico
  FOR ALL USING (
    current_setting('app.current_clinica_id', true) IS NULL
    OR current_setting('app.current_clinica_id', true) = ''
    OR clinica_id = current_setting('app.current_clinica_id', true)
  );

DROP POLICY IF EXISTS tenant_isolation ON scheduling_paciente;
CREATE POLICY tenant_isolation ON scheduling_paciente
  FOR ALL USING (
    current_setting('app.current_clinica_id', true) IS NULL
    OR current_setting('app.current_clinica_id', true) = ''
    OR clinica_id = current_setting('app.current_clinica_id', true)
  );

DROP POLICY IF EXISTS tenant_isolation ON scheduling_cita;
CREATE POLICY tenant_isolation ON scheduling_cita
  FOR ALL USING (
    current_setting('app.current_clinica_id', true) IS NULL
    OR current_setting('app.current_clinica_id', true) = ''
    OR clinica_id = current_setting('app.current_clinica_id', true)
  );

DROP POLICY IF EXISTS tenant_isolation ON accounts_user;
CREATE POLICY tenant_isolation ON accounts_user
  FOR ALL USING (
    current_setting('app.current_clinica_id', true) IS NULL
    OR current_setting('app.current_clinica_id', true) = ''
    OR clinica_id = current_setting('app.current_clinica_id', true)
  );

-- ── tablas hijas: se validan a través de su padre ────────────────────────────
DROP POLICY IF EXISTS tenant_isolation ON tenants_consultorio;
CREATE POLICY tenant_isolation ON tenants_consultorio
  FOR ALL USING (
    current_setting('app.current_clinica_id', true) IS NULL
    OR current_setting('app.current_clinica_id', true) = ''
    OR sucursal_id IN (
      SELECT id FROM tenants_sucursal
      WHERE clinica_id = current_setting('app.current_clinica_id', true)
    )
  );

DROP POLICY IF EXISTS tenant_isolation ON scheduling_disponibilidad;
CREATE POLICY tenant_isolation ON scheduling_disponibilidad
  FOR ALL USING (
    current_setting('app.current_clinica_id', true) IS NULL
    OR current_setting('app.current_clinica_id', true) = ''
    OR medico_id IN (
      SELECT id FROM scheduling_medico
      WHERE clinica_id = current_setting('app.current_clinica_id', true)
    )
  );

DROP POLICY IF EXISTS tenant_isolation ON scheduling_bloqueoagenda;
CREATE POLICY tenant_isolation ON scheduling_bloqueoagenda
  FOR ALL USING (
    current_setting('app.current_clinica_id', true) IS NULL
    OR current_setting('app.current_clinica_id', true) = ''
    OR medico_id IN (
      SELECT id FROM scheduling_medico
      WHERE clinica_id = current_setting('app.current_clinica_id', true)
    )
  );

DROP POLICY IF EXISTS tenant_isolation ON scheduling_fichaclinica;
CREATE POLICY tenant_isolation ON scheduling_fichaclinica
  FOR ALL USING (
    current_setting('app.current_clinica_id', true) IS NULL
    OR current_setting('app.current_clinica_id', true) = ''
    OR paciente_id IN (
      SELECT id FROM scheduling_paciente
      WHERE clinica_id = current_setting('app.current_clinica_id', true)
    )
  );

DROP POLICY IF EXISTS tenant_isolation ON notifications_notificacion;
CREATE POLICY tenant_isolation ON notifications_notificacion
  FOR ALL USING (
    current_setting('app.current_clinica_id', true) IS NULL
    OR current_setting('app.current_clinica_id', true) = ''
    OR cita_id IN (
      SELECT id FROM scheduling_cita
      WHERE clinica_id = current_setting('app.current_clinica_id', true)
    )
  );

-- La propia tabla de clínicas: cada tenant solo ve la suya; sin GUC ve todas.
DROP POLICY IF EXISTS tenant_isolation ON tenants_clinica;
CREATE POLICY tenant_isolation ON tenants_clinica
  FOR ALL USING (
    current_setting('app.current_clinica_id', true) IS NULL
    OR current_setting('app.current_clinica_id', true) = ''
    OR id = current_setting('app.current_clinica_id', true)
  );

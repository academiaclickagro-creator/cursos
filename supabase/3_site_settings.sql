-- ==============================================================================
-- PARTE 3: TABLA DE CONFIGURACIÓN GLOBAL (SITE_SETTINGS) Y POLÍTICAS RLS
-- Academia Click Agro - Módulo de Gestión Operativa y Credenciales
-- ==============================================================================

-- 1. CREACIÓN DE TABLA SITE_SETTINGS
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Comentario descriptivo en la tabla
COMMENT ON TABLE public.site_settings IS 'Parámetros de configuración globales y operativos gestionables desde /admin/configuracion';

-- 2. HABILITACIÓN DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICA DE LECTURA (SEGURIDAD DE CLAVES PÚBLICAS Y PRIVADAS)
-- Permite lectura pública de variables operativas no sensibles (WhatsApp, emails de soporte, avisos).
-- Bloquea la lectura de llaves sensibles (como resend_api_key) para no administradores.
DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read"
  ON public.site_settings
  FOR SELECT
  USING (
    key NOT IN ('resend_api_key')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  );

-- 4. POLÍTICA DE ESCRITURA Y ACTUALIZACIÓN EXCLUSIVA PARA ADMINS
-- Solo usuarios con role = 'admin' en public.profiles pueden insertar, actualizar o eliminar configuraciones
DROP POLICY IF EXISTS "site_settings_admin_manage" ON public.site_settings;
CREATE POLICY "site_settings_admin_manage"
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
        AND public.profiles.role = 'admin'
    )
  );

-- 5. TRIGGER AUTOMÁTICO PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION public.handle_site_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_site_settings_updated ON public.site_settings;
CREATE TRIGGER on_site_settings_updated
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_site_settings_updated_at();

-- 6. DATOS SEMILLA (SEEDS) POR DEFECTO
INSERT INTO public.site_settings (key, value, description)
VALUES 
  (
    'whatsapp_number',
    '5491100000000',
    'Número oficial de WhatsApp para soporte y consultas comerciales (formato internacional sin +)'
  ),
  (
    'support_email',
    'contacto@clickagro.com.ar',
    'Correo electrónico oficial de atención al cliente y soporte técnico'
  ),
  (
    'teacher_alert_email',
    'profesores@clickagro.com.ar',
    'Bandeja de correo destino para alertas de preguntas formuladas por alumnos en clases'
  ),
  (
    'resend_from_email',
    'Academia Click Agro <notificaciones@clickagro.com.ar>',
    'Nombre y dirección de remitente oficial para emails transaccionales'
  ),
  (
    'resend_api_key',
    '',
    'API Key oficial de Resend (re_...). Si está vacía, se utiliza la variable de entorno RESEND_API_KEY'
  ),
  (
    'is_maintenance_mode',
    'false',
    'Indica si el sitio se encuentra en modo mantenimiento global (true o false)'
  ),
  (
    'pending_payment_message',
    'Si abonaste mediante Pago Fácil, Rapipago o Red Link, la acreditación puede demorar entre unas horas y 1 día hábil. Tan pronto como Mercado Pago nos notifique, se habilitará tu acceso de manera 100% automática.',
    'Leyenda explicativa que se muestra a los estudiantes en /checkout/pending'
  ),
  (
    'maintenance_notice_message',
    'Estamos realizando mejoras técnicas en nuestra plataforma para brindarte una mejor experiencia de aprendizaje. Volvemos en breve.',
    'Mensaje visible para los visitantes cuando el sitio está en modo de mantenimiento'
  )
ON CONFLICT (key) DO UPDATE
SET 
  description = EXCLUDED.description,
  updated_at = timezone('utc'::text, now());

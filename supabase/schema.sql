-- ==============================================================================
-- ACADEMIA CLICK AGRO - ESQUEMA COMPLETO DE BASE DE DATOS Y RLS (SUPABASE)
-- ==============================================================================

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: profiles (Sincronizada con auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')) DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger para crear o actualizar profiles al registrar un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $func$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. TABLA: courses (Cursos individuales)
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  cover_image TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA: modules (Módulos temáticos de un curso)
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA: lessons (Lecciones individuales)
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  youtube_video_id TEXT,
  zoom_link TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_free_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABLA: lesson_resources (Material descargable: PDFs, planillas Excel)
CREATE TABLE IF NOT EXISTS public.lesson_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABLA: combos (Paquetes o carreras que agrupan varios cursos)
CREATE TABLE IF NOT EXISTS public.combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  cover_image TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABLA INTERMEDIA: combo_courses
CREATE TABLE IF NOT EXISTS public.combo_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES public.combos(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  UNIQUE(combo_id, course_id)
);

-- 9. TABLA: coupons (Cupones de descuento)
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. TABLA: enrollments (Matrículas y ventas)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  combo_id UUID REFERENCES public.combos(id) ON DELETE CASCADE,
  payment_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'approved' CHECK (payment_status IN ('approved', 'pending', 'rejected', 'refunded')),
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. TABLA: lesson_progress (Progreso del estudiante)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, lesson_id)
);

-- 12. TABLA: certificates (Certificados emitidos con código QR / público)
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_code TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  course_title TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, course_id)
);

-- 13. TABLA: comments (Foro de preguntas y respuestas)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. FUNCIÓN RPC: has_course_access
-- Valida si un usuario es admin/profesor o si tiene una matrícula aprobada para el curso (directa o vía combo)
CREATE OR REPLACE FUNCTION public.has_course_access(p_user_id UUID, p_course_id UUID)
RETURNS BOOLEAN AS $body$
DECLARE
  v_role TEXT;
  v_enrolled BOOLEAN;
BEGIN
  -- Verificar rol administrativo o docente
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  IF v_role IN ('admin', 'teacher') THEN
    RETURN true;
  END IF;

  -- Verificar matrícula directa o por combo
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = p_user_id
      AND e.payment_status = 'approved'
      AND (
        e.course_id = p_course_id
        OR e.combo_id IN (
          SELECT cc.combo_id FROM public.combo_courses cc WHERE cc.course_id = p_course_id
        )
      )
  ) INTO v_enrolled;

  RETURN COALESCE(v_enrolled, false);
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Políticas de PROFILES
CREATE POLICY "Profiles son legibles por usuarios autenticados"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Políticas de COURSES y COMBOS (Públicos los publicados, administrables por admin/teacher)
CREATE POLICY "Cursos publicados son visibles públicamente"
  ON public.courses FOR SELECT USING (is_published = true OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'teacher')));

CREATE POLICY "Admins y teachers pueden gestionar cursos"
  ON public.courses FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "Combos publicados son visibles públicamente"
  ON public.combos FOR SELECT USING (is_published = true OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'teacher')));

CREATE POLICY "Admins y teachers pueden gestionar combos"
  ON public.combos FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "Combo courses visibles públicamente"
  ON public.combo_courses FOR SELECT USING (true);

-- Políticas de MODULES y LESSONS
CREATE POLICY "Módulos son visibles públicamente"
  ON public.modules FOR SELECT USING (true);

CREATE POLICY "Lecciones públicas o para alumnos con acceso"
  ON public.lessons FOR SELECT USING (
    is_free_preview = true
    OR public.has_course_access(auth.uid(), course_id)
  );

-- Políticas de ENROLLMENTS
CREATE POLICY "Usuarios ven sus propias matrículas"
  ON public.enrollments FOR SELECT TO authenticated USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- Políticas de LESSON_PROGRESS
CREATE POLICY "Usuarios gestionan su propio progreso"
  ON public.lesson_progress FOR ALL TO authenticated USING (user_id = auth.uid());

-- Políticas de CERTIFICATES
CREATE POLICY "Certificados visibles para todos por código público"
  ON public.certificates FOR SELECT USING (true);

CREATE POLICY "Certificados emitibles por usuario autorizado"
  ON public.certificates FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND public.has_course_access(auth.uid(), course_id)
  );

-- Políticas de COMMENTS
CREATE POLICY "Comentarios visibles por alumnos del curso"
  ON public.comments FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.lessons l 
      WHERE l.id = lesson_id AND public.has_course_access(auth.uid(), l.course_id)
    )
  );

CREATE POLICY "Alumnos matriculados pueden comentar"
  ON public.comments FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.lessons l 
      WHERE l.id = lesson_id AND public.has_course_access(auth.uid(), l.course_id)
    )
  );

-- Políticas de COUPONS
CREATE POLICY "Admins gestionan cupones"
  ON public.coupons FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "Validación de cupones activa"
  ON public.coupons FOR SELECT USING (is_active = true);

-- ==============================================================================
-- DATOS SEMILLA DE PRUEBA (SEED)
-- ==============================================================================

-- Curso inicial de prueba
INSERT INTO public.courses (id, title, slug, description, price, cover_image, is_published)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Manejo de Pulverizaciones Agrícolas de Precisión',
  'manejo-pulverizaciones-agricolas',
  'Domina la calibración de picos, control de deriva, cálculo de dosis por hectárea y uso de adyuvantes con casos reales a campo.',
  45000.00,
  'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?q=80&w=1200',
  true
) ON CONFLICT (id) DO NOTHING;

-- Módulo 1
INSERT INTO public.modules (id, course_id, title, position)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Módulo 1: Fundamentos de la Calibración y Deriva',
  1
) ON CONFLICT (id) DO NOTHING;

-- Lección 1 (Preview Libre)
INSERT INTO public.lessons (id, course_id, module_id, title, description, youtube_video_id, position, is_free_preview)
VALUES (
  '33333333-3333-3333-3333-333333333331',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Clase 1: Introducción a la tecnología de aplicación',
  'Conceptos básicos de tamaño de gota, presión de trabajo y condiciones climáticas óptimas.',
  'dQw4w9WgXcQ',
  1,
  true
) ON CONFLICT (id) DO NOTHING;

-- Lección 2 (Contenido Protegido)
INSERT INTO public.lessons (id, course_id, module_id, title, description, youtube_video_id, position, is_free_preview)
VALUES (
  '33333333-3333-3333-3333-333333333332',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Clase 2: Calibración práctica de boquillas en lote',
  'Cálculo exacto de caudal por minuto y verificación con probeta graduada en campo.',
  'dQw4w9WgXcQ',
  2,
  false
) ON CONFLICT (id) DO NOTHING;

-- Cupón de prueba de 50%
INSERT INTO public.coupons (code, discount_percent, max_uses, is_active)
VALUES ('LANZAMIENTO50', 50.00, 100, true)
ON CONFLICT (code) DO NOTHING;

-- ==============================================================================
-- 13. SITE_SETTINGS (CONFIGURACIÓN GLOBAL OPERATIVA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read"
  ON public.site_settings FOR SELECT
  USING (
    key NOT IN ('resend_api_key')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "site_settings_admin_manage" ON public.site_settings;
CREATE POLICY "site_settings_admin_manage"
  ON public.site_settings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

INSERT INTO public.site_settings (key, value, description)
VALUES 
  ('whatsapp_number', '5491100000000', 'Número oficial de WhatsApp para soporte y consultas'),
  ('support_email', 'contacto@clickagro.com.ar', 'Correo electrónico oficial de atención al cliente'),
  ('teacher_alert_email', 'profesores@clickagro.com.ar', 'Correo de alertas para consultas de alumnos'),
  ('resend_from_email', 'Academia Click Agro <notificaciones@clickagro.com.ar>', 'Remitente oficial de correos'),
  ('resend_api_key', '', 'API Key de Resend (fallback a env RESEND_API_KEY)'),
  ('is_maintenance_mode', 'false', 'Modo mantenimiento del sitio (true o false)'),
  ('pending_payment_message', 'Si abonaste mediante Pago Fácil, Rapipago o Red Link, la acreditación puede demorar entre unas horas y 1 día hábil. Tan pronto como Mercado Pago nos notifique, se habilitará tu acceso de manera 100% automática.', 'Mensaje en pantalla de pago pendiente'),
  ('maintenance_notice_message', 'Estamos realizando mejoras técnicas en nuestra plataforma para brindarte una mejor experiencia de aprendizaje. Volvemos en breve.', 'Mensaje durante modo mantenimiento')
ON CONFLICT (key) DO NOTHING;

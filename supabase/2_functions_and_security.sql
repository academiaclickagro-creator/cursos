-- ==============================================================================
-- PARTE 2: FUNCIONES PL/PGSQL, TRIGGERS Y POLÍTICAS RLS
-- ==============================================================================

-- 1. TRIGGER PARA CREAR PERFIL TRAS REGISTRO EN AUTH.USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
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
$func$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. FUNCIÓN RPC PARA COMPROBAR ACCESO AL CURSO
CREATE OR REPLACE FUNCTION public.has_course_access(p_user_id UUID, p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_role TEXT;
  v_enrolled BOOLEAN;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  IF v_role IN ('admin', 'teacher') THEN
    RETURN true;
  END IF;

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
$func$;

-- 3. HABILITACIÓN DE RLS
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

-- 4. POLÍTICAS DE ACCESO
DROP POLICY IF EXISTS "Profiles son legibles por usuarios autenticados" ON public.profiles;
CREATE POLICY "Profiles son legibles por usuarios autenticados"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Cursos publicados son visibles públicamente" ON public.courses;
CREATE POLICY "Cursos publicados son visibles públicamente"
  ON public.courses FOR SELECT USING (is_published = true OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'teacher')));

DROP POLICY IF EXISTS "Admins y teachers pueden gestionar cursos" ON public.courses;
CREATE POLICY "Admins y teachers pueden gestionar cursos"
  ON public.courses FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

DROP POLICY IF EXISTS "Combos publicados son visibles públicamente" ON public.combos;
CREATE POLICY "Combos publicados son visibles públicamente"
  ON public.combos FOR SELECT USING (is_published = true OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'teacher')));

DROP POLICY IF EXISTS "Admins y teachers pueden gestionar combos" ON public.combos;
CREATE POLICY "Admins y teachers pueden gestionar combos"
  ON public.combos FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

DROP POLICY IF EXISTS "Combo courses visibles públicamente" ON public.combo_courses;
CREATE POLICY "Combo courses visibles públicamente"
  ON public.combo_courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Módulos son visibles públicamente" ON public.modules;
CREATE POLICY "Módulos son visibles públicamente"
  ON public.modules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lecciones públicas o para alumnos con acceso" ON public.lessons;
CREATE POLICY "Lecciones públicas o para alumnos con acceso"
  ON public.lessons FOR SELECT USING (
    is_free_preview = true
    OR public.has_course_access(auth.uid(), course_id)
  );

DROP POLICY IF EXISTS "Usuarios ven sus propias matrículas" ON public.enrollments;
CREATE POLICY "Usuarios ven sus propias matrículas"
  ON public.enrollments FOR SELECT TO authenticated USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

DROP POLICY IF EXISTS "Usuarios gestionan su propio progreso" ON public.lesson_progress;
CREATE POLICY "Usuarios gestionan su propio progreso"
  ON public.lesson_progress FOR ALL TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Certificados visibles para todos por código público" ON public.certificates;
CREATE POLICY "Certificados visibles para todos por código público"
  ON public.certificates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Certificados emitibles por usuario autorizado" ON public.certificates;
CREATE POLICY "Certificados emitibles por usuario autorizado"
  ON public.certificates FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND public.has_course_access(auth.uid(), course_id)
  );

DROP POLICY IF EXISTS "Comentarios visibles por alumnos del curso" ON public.comments;
CREATE POLICY "Comentarios visibles por alumnos del curso"
  ON public.comments FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.lessons l 
      WHERE l.id = lesson_id AND public.has_course_access(auth.uid(), l.course_id)
    )
  );

DROP POLICY IF EXISTS "Alumnos matriculados pueden comentar" ON public.comments;
CREATE POLICY "Alumnos matriculados pueden comentar"
  ON public.comments FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.lessons l 
      WHERE l.id = lesson_id AND public.has_course_access(auth.uid(), l.course_id)
    )
  );

DROP POLICY IF EXISTS "Admins gestionan cupones" ON public.coupons;
CREATE POLICY "Admins gestionan cupones"
  ON public.coupons FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

DROP POLICY IF EXISTS "Validación de cupones activa" ON public.coupons;
CREATE POLICY "Validación de cupones activa"
  ON public.coupons FOR SELECT USING (is_active = true);

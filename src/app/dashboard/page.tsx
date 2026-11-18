'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  GraduationCap, 
  BookOpen, 
  PlayCircle, 
  Award, 
  Clock, 
  CheckCircle2, 
  LogOut, 
  LayoutDashboard, 
  ArrowRight,
  Loader2,
  Sparkles,
  User
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function StudentDashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStudentData() {
      setIsLoading(true);
      try {
        const { data: authData } = await supabaseBrowser.auth.getUser();
        const user = authData?.user;

        if (!user) {
          // Si no está autenticado, redirigir a login
          window.location.href = '/login?redirect=/dashboard';
          return;
        }

        const { data: profileData } = await supabaseBrowser
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const resolvedName = profileData?.full_name || 
          [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ') ||
          user.user_metadata?.full_name ||
          'Estudiante';

        setProfile(profileData ? { ...profileData, full_name: resolvedName } : { email: user.email, full_name: resolvedName, role: 'student' });

        // 1. Obtener todas las matrículas aprobadas del usuario
        const { data: enrollments } = await supabaseBrowser
          .from('enrollments')
          .select('*, courses(*), combos(*)')
          .eq('user_id', user.id)
          .eq('payment_status', 'approved');

        // Consolidar IDs de cursos (directos o provenientes de combos)
        const courseIdsSet = new Set<string>();
        const directCourses: any[] = [];

        (enrollments || []).forEach((e) => {
          if (e.courses && !courseIdsSet.has(e.courses.id)) {
            courseIdsSet.add(e.courses.id);
            directCourses.push(e.courses);
          }
        });

        // Para los combos adquiridos, consultar sus cursos en combo_courses
        const comboIds = (enrollments || []).filter(e => e.combo_id).map(e => e.combo_id);
        if (comboIds.length > 0) {
          const { data: comboCoursesData } = await supabaseBrowser
            .from('combo_courses')
            .select('courses(*)')
            .in('combo_id', comboIds);

          (comboCoursesData || []).forEach((cc: any) => {
            if (cc.courses && !courseIdsSet.has(cc.courses.id)) {
              courseIdsSet.add(cc.courses.id);
              directCourses.push(cc.courses);
            }
          });
        }

        // 2. Para cada curso, calcular porcentaje de avance según materiales y contenidos utilizados
        const userCoursesProgress = user.user_metadata?.courses_progress || {};

        const coursesWithMetrics = await Promise.all(
          directCourses.map(async (course) => {
            const { data: lessons } = await supabaseBrowser
              .from('lessons')
              .select('id, youtube_video_id, lesson_resources(id)')
              .eq('course_id', course.id);

            let totalItems = 0;
            (lessons || []).forEach((l: any) => {
              if (l.youtube_video_id) totalItems += 1;
              const resCount = l.lesson_resources?.length || 0;
              totalItems += resCount;
            });

            if (totalItems === 0) {
              totalItems = lessons?.length || 1;
            }

            let completedList: string[] = userCoursesProgress[course.id] || [];
            if (completedList.length === 0 && typeof window !== 'undefined') {
              try {
                const local = localStorage.getItem(`clickagro_progress_${user.id}_${course.id}`);
                if (local) completedList = JSON.parse(local);
              } catch {}
            }

            const completedCount = completedList.length;
            const percentage = totalItems > 0
              ? Math.min(100, Math.round((completedCount / totalItems) * 100))
              : 0;

            return {
              ...course,
              cover_image: course.cover_image || course.image_url || null,
              image_url: course.cover_image || course.image_url || null,
              totalLessons: totalItems,
              completedLessons: completedCount,
              percentage,
            };
          })
        );

        setEnrolledCourses(coursesWithMetrics);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStudentData();
  }, []);

  const handleSignOut = async () => {
    await supabaseBrowser.auth.signOut();
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-4">
        <Loader2 className="w-10 h-10 text-agro-500 animate-spin mb-4" />
        <p className="text-xs text-zinc-400 font-medium">Cargando tus cursos asignados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* 1. Header del Portal */}
      <header className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-8 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
              <Image src="/logo.png" alt="Click Agro" fill className="object-contain" priority />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-zinc-950 dark:text-white leading-none block">
                ACADEMIA <span className="text-agro-600 dark:text-agro-400">CLICK AGRO</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                Portal del Estudiante
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {(profile?.role === 'admin' || profile?.role === 'teacher') && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-zinc-800 text-white hover:bg-zinc-800 border border-zinc-700 transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-agro-400" />
                <span>Panel Administrativo</span>
              </Link>
            )}

            <Link
              href="/dashboard/perfil"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-agro-500 dark:hover:text-agro-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mi Perfil</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
        
        {/* Banner de Bienvenida */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-agro-950 via-zinc-900 to-zinc-900 border border-agro-500/30 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-agro-500/20 text-agro-300 border border-agro-500/30 mb-2">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Campus Virtual Activo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              ¡Hola, {profile?.full_name || 'Estudiante'}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              Aquí tienes todos tus cursos disponibles. Continúa desde donde lo dejaste y avanza a tu propio ritmo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/#catalogo"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-agro-500/25 hover:scale-[1.02]"
            >
              <span>Explorar Más Cursos</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Sección: Mis Cursos Activos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-agro-600 dark:text-agro-400" />
              <span>Mis Cursos Matriculados</span>
            </h2>
            <span className="text-xs font-semibold text-zinc-400">
              {enrolledCourses.length} {enrolledCourses.length === 1 ? 'programa' : 'programas'}
            </span>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
                  Aún no tienes cursos activos
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                  Explora nuestro catálogo en tecnología agropecuaria para comenzar tu capacitación.
                </p>
              </div>
              <Link
                href="/#catalogo"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-xs transition-all shadow-md"
              >
                <span>Ver Catálogo de Cursos</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Imagen de Portada */}
                    <div className="relative w-full h-44 bg-zinc-950 overflow-hidden flex items-center justify-center p-2">
                      {course.cover_image || course.image_url ? (
                        <img
                          src={course.cover_image || course.image_url}
                          alt={course.title}
                          className="max-h-full max-w-full object-contain p-1"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/80 rounded-2xl border border-zinc-800">
                          <BookOpen className="w-8 h-8 mb-2 text-agro-500/70" />
                          <span className="text-[11px] font-semibold text-zinc-400">Academia Click Agro</span>
                        </div>
                      )}
                      {course.percentage === 100 && (
                        <div className="absolute top-3 right-3 bg-amber-400 text-zinc-950 px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                          <Award className="w-3.5 h-3.5" />
                          <span>Completado</span>
                        </div>
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="p-6 space-y-3">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {course.description}
                      </p>

                      {/* Barra de Progreso */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                          <span className="text-zinc-500">Progreso del curso</span>
                          <span className="text-agro-600 dark:text-agro-400 font-bold">
                            {course.percentage}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-agro-500 transition-all duration-300"
                            style={{ width: `${course.percentage}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          {course.completedLessons} de {course.totalLessons} contenidos completados
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botón Acceder al Curso */}
                  <div className="p-6 pt-0">
                    <Link
                      href={`/dashboard/cursos/${course.slug}`}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-agro-500 hover:text-white text-zinc-200 font-bold text-xs transition-all shadow-xs"
                    >
                      <PlayCircle className="w-4 h-4 text-agro-400 group-hover:text-white" />
                      <span>{course.percentage === 0 ? 'Acceder al Curso' : 'Continuar Curso'}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

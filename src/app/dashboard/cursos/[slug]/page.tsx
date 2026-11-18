'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  FileSpreadsheet, 
  FileText, 
  Video, 
  Presentation, 
  FolderArchive, 
  Image as ImageIcon, 
  MapPin, 
  FileCheck, 
  Search, 
  Award, 
  Lock, 
  ShieldAlert, 
  ArrowLeft, 
  Loader2, 
  Calendar, 
  Clock, 
  Sparkles, 
  ShoppingBag,
  LogIn,
  Paperclip,
  Check,
  CheckCheck,
  Play
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { VideoPlayer } from '@/components/classroom/VideoPlayer';
import { LessonComments } from '@/components/classroom/LessonComments';
import { CertificateModal } from '@/components/classroom/CertificateModal';
import { detectFileType, FileTypeInfo } from '@/lib/fileFormatUtils';

interface ClassroomPageProps {
  params: {
    slug: string;
  };
}

interface CourseVideoItem {
  id: string;
  title: string;
  url: string;
  position: number;
}

interface MaterialItem {
  id: string;
  title: string;
  url: string;
  fileInfo: FileTypeInfo;
}

export default function CourseClassroomPage({ params }: ClassroomPageProps) {
  const { slug } = params;

  // Estados de datos
  const [course, setCourse] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);

  // Contenidos del curso
  const [videosList, setVideosList] = useState<CourseVideoItem[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string>('');

  // Control de checkboxes y progreso
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [isSavingProgress, setIsSavingProgress] = useState(false);

  // Filtros de búsqueda en materiales
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // 1. Cargar curso y validar matrícula
  useEffect(() => {
    async function loadCourseData() {
      setIsLoading(true);
      try {
        const { data: authData } = await supabaseBrowser.auth.getUser();
        const user = authData?.user;

        if (!user) {
          setIsEnrolled(false);
          setCurrentUser(null);
          
          const { data: publicCourse } = await supabaseBrowser
            .from('courses')
            .select('id, title, description, price, slug')
            .eq('slug', slug)
            .maybeSingle();

          setCourse(publicCourse || {
            title: 'Curso en Academia Click Agro',
            description: 'Inicia sesión para acceder a todos los contenidos del curso.',
            price: 0,
            slug,
          });
          setIsLoading(false);
          return;
        }

        const { data: profile } = await supabaseBrowser
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const resolvedFullName = profile?.full_name ||
          [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ') ||
          user.user_metadata?.full_name ||
          'Estudiante';

        const userProfile = profile ? {
          ...profile,
          full_name: resolvedFullName,
        } : {
          id: user.id,
          email: user.email,
          full_name: resolvedFullName,
          role: 'student',
        };
        setCurrentUser(userProfile);

        // Obtener curso por slug
        const { data: courseData, error: courseError } = await supabaseBrowser
          .from('courses')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (courseError || !courseData) {
          setIsEnrolled(false);
          setIsLoading(false);
          return;
        }

        setCourse(courseData);

        // Validar matrícula aprobada o rol admin/docente
        const isMasterAdmin = user.email?.toLowerCase() === 'academiaclickagro@gmail.com';
        const isAdminOrTeacher = userProfile.role === 'admin' || userProfile.role === 'teacher' || isMasterAdmin;

        const { data: hasAccess } = await supabaseBrowser
          .rpc('has_course_access', {
            p_course_id: courseData.id,
            p_user_id: user.id,
          });

        const userHasAccess = isAdminOrTeacher || Boolean(hasAccess);
        setIsEnrolled(userHasAccess);

        if (!userHasAccess) {
          setIsLoading(false);
          return;
        }

        // Cargar contenidos del curso vía API con bypass seguro de RLS
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        const token = sessionData?.session?.access_token;

        let lessonsData: any[] = [];
        if (token) {
          try {
            const apiRes = await fetch(`/api/courses/${slug}/lessons`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (apiRes.ok) {
              const apiJson = await apiRes.json();
              lessonsData = apiJson?.lessons || [];
            }
          } catch (apiErr) {
            console.error('Error al consultar /api/courses/slug/lessons:', apiErr);
          }
        }

        // Fallback directo si fuese necesario
        if (lessonsData.length === 0) {
          const { data: fallbackData } = await supabaseBrowser
            .from('lessons')
            .select('*, lesson_resources(*)')
            .eq('course_id', courseData.id)
            .order('position', { ascending: true });
          lessonsData = fallbackData || [];
        }

        // Extraer todos los videos disponibles y TODOS los materiales sin divisiones de clases
        const extractedVideos: CourseVideoItem[] = [];
        const allExtractedMaterials: MaterialItem[] = [];

        (lessonsData || []).forEach((l: any, lIdx: number) => {
          if (!activeLessonId && lIdx === 0) {
            setActiveLessonId(l.id);
          }

          // Video de la lección
          const videoUrl = l.youtube_video_id || l.video_youtube_id;
          if (videoUrl) {
            extractedVideos.push({
              id: l.id,
              title: l.title || `Clase ${lIdx + 1}`,
              url: videoUrl,
              position: l.position || (lIdx + 1),
            });
          }

          // Materiales de lesson_resources
          (l.lesson_resources || []).forEach((r: any) => {
            const fileUrl = r.file_url || r.url;
            if (!fileUrl) return;
            if (allExtractedMaterials.some(m => m.url === fileUrl)) return;
            const title = r.title || r.name || 'Material Descargable';
            const fileInfo = detectFileType(title);
            allExtractedMaterials.push({
              id: `resource-${r.id || fileUrl}`,
              title,
              url: fileUrl,
              fileInfo,
            });
          });

          // Materiales en attachment_urls
          if (l.attachment_urls) {
            let parsedAtts: any[] = [];
            if (typeof l.attachment_urls === 'string') {
              try { parsedAtts = JSON.parse(l.attachment_urls); } catch { parsedAtts = [l.attachment_urls]; }
            } else if (Array.isArray(l.attachment_urls)) {
              parsedAtts = l.attachment_urls;
            }

            parsedAtts.forEach((att: any, aIdx: number) => {
              const url = typeof att === 'string' ? att : (att.url || att.file_url);
              if (!url) return;
              if (allExtractedMaterials.some(m => m.url === url)) return; // Evitar duplicados

              const rawName = typeof att === 'string'
                ? (url.split('/').pop()?.split('?')[0] || `Material_${aIdx + 1}`)
                : (att.name || att.title || `Material_${aIdx + 1}`);

              const name = decodeURIComponent(rawName);
              const fileInfo = detectFileType(name);

              allExtractedMaterials.push({
                id: `legacy-${l.id}-${aIdx}`,
                title: name,
                url,
                fileInfo,
              });
            });
          }
        });

        setVideosList(extractedVideos);
        if (extractedVideos.length > 0) {
          setSelectedVideoId(extractedVideos[0].id);
        }
        setMaterials(allExtractedMaterials);

        // Cargar progreso del usuario
        // 1. Intentar desde user_metadata
        const userProgress = user.user_metadata?.courses_progress?.[courseData.id];
        let initialCompleted: string[] = [];

        if (Array.isArray(userProgress)) {
          initialCompleted = userProgress;
        } else {
          // Fallback a localStorage
          const localStored = localStorage.getItem(`clickagro_progress_${user.id}_${courseData.id}`);
          if (localStored) {
            try {
              initialCompleted = JSON.parse(localStored);
            } catch {
              initialCompleted = [];
            }
          }
        }

        setCompletedItems(initialCompleted);
      } catch (err) {
        console.error('Error cargando contenidos del curso:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCourseData();
  }, [slug]);

  // Lista total de ítems evaluables para el progreso
  const allTrackableItems = useMemo(() => {
    const items: Array<{ id: string; type: string; title: string }> = [];
    videosList.forEach((v) => {
      items.push({ id: `video-${v.id}`, type: 'video', title: v.title });
    });
    materials.forEach((m) => {
      items.push({ id: m.id, type: 'material', title: m.title });
    });
    return items;
  }, [videosList, materials]);

  // Video seleccionado actualmente
  const activeVideoIndex = videosList.findIndex((v) => v.id === selectedVideoId);
  const currentVideo = activeVideoIndex >= 0 ? videosList[activeVideoIndex] : (videosList[0] || null);
  const resolvedVideoIndex = activeVideoIndex >= 0 ? activeVideoIndex : 0;

  // Cálculo del progreso general (porcentaje de 0% a 100%)
  const totalCount = allTrackableItems.length;
  const completedCount = allTrackableItems.filter((i) => completedItems.includes(i.id)).length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isCourseFinished = progressPercentage === 100 && totalCount > 0;

  // Manejo interactivo de Checkbox (Marcar / Desmarcar)
  const toggleItemCheckbox = async (itemId: string) => {
    if (!currentUser || !course) return;

    const isCurrentlyChecked = completedItems.includes(itemId);
    const updated = isCurrentlyChecked
      ? completedItems.filter((id) => id !== itemId)
      : [...completedItems, itemId];

    // Actualización optimista inmediata en UI y localStorage
    setCompletedItems(updated);
    try {
      localStorage.setItem(`clickagro_progress_${currentUser.id}_${course.id}`, JSON.stringify(updated));
    } catch {}

    // Persistir en Supabase a través del endpoint administrativo
    setIsSavingProgress(true);
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (token) {
        await fetch(`/api/courses/${course.slug}/progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            itemId,
            completed: !isCurrentlyChecked,
            allCompletedItems: updated,
          }),
        });
      }
    } catch (err) {
      console.error('Error sincronizando progreso:', err);
    } finally {
      setIsSavingProgress(false);
    }
  };

  // Marcar todos los materiales como utilizados
  const handleToggleAllMaterials = async (selectAll: boolean) => {
    if (!currentUser || !course) return;

    let updated: string[] = [];
    if (selectAll) {
      updated = Array.from(new Set([...completedItems, ...allTrackableItems.map((i) => i.id)]));
    } else {
      updated = [];
    }

    setCompletedItems(updated);
    try {
      localStorage.setItem(`clickagro_progress_${currentUser.id}_${course.id}`, JSON.stringify(updated));
    } catch {}

    setIsSavingProgress(true);
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (token) {
        await fetch(`/api/courses/${course.slug}/progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            allCompletedItems: updated,
          }),
        });
      }
    } catch (err) {
      console.error('Error al actualizar todos los materiales:', err);
    } finally {
      setIsSavingProgress(false);
    }
  };

  // Filtrado de materiales
  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.fileInfo.extension.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || item.fileInfo.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [materials, searchQuery, categoryFilter]);

  const renderIcon = (category: string, className = "w-5 h-5") => {
    switch (category) {
      case 'excel':
        return <FileSpreadsheet className={`${className} text-emerald-500`} />;
      case 'pdf':
        return <FileText className={`${className} text-red-500`} />;
      case 'video':
        return <Video className={`${className} text-purple-500`} />;
      case 'presentation':
        return <Presentation className={`${className} text-amber-500`} />;
      case 'archive':
        return <FolderArchive className={`${className} text-orange-500`} />;
      case 'image':
        return <ImageIcon className={`${className} text-cyan-500`} />;
      case 'geo':
        return <MapPin className={`${className} text-teal-500`} />;
      default:
        return <FileCheck className={`${className} text-zinc-500`} />;
    }
  };

  // PANTALLA DE CARGA
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white px-4">
        <Loader2 className="w-10 h-10 text-agro-500 animate-spin mb-4" />
        <p className="text-sm text-zinc-400 font-medium">Cargando todos los contenidos del curso...</p>
      </div>
    );
  }

  // ACCESO RESTRINGIDO
  if (!isEnrolled) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <header className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
              <Image src="/logo.png" alt="Click Agro" fill sizes="32px" className="object-contain" priority />
            </div>
            <span className="text-sm font-black tracking-tight text-white">
              ACADEMIA <span className="text-agro-400">CLICK AGRO</span>
            </span>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al catálogo</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Contenido Exclusivo
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                Acceso Restringido al Curso
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                El curso <strong className="text-zinc-200">"{course?.title}"</strong> requiere una inscripción activa para acceder a todo el material descargable y videos formativos.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                href={`/checkout?course_id=${course?.id}`}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-sm transition-all shadow-lg hover:shadow-agro-500/25"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Inscribirme ahora ({course?.price ? `$${course.price} ARS` : 'Comprar Curso'})</span>
              </Link>

              {!currentUser && (
                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>¿Ya eres alumno? Inicia Sesión</span>
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* 1. BARRA SUPERIOR (HEADER) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-agro-600 dark:hover:text-agro-400 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Mis Cursos Matriculados</span>
          </Link>

          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block shrink-0" />

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
              <Image src="/logo.png" alt="Academia Click Agro" fill sizes="32px" className="object-contain" priority />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-black tracking-tight text-zinc-900 dark:text-zinc-100 hidden sm:block">
                ACADEMIA <span className="text-agro-600 dark:text-agro-400">CLICK AGRO</span>
              </span>
              <p className="text-[10px] text-zinc-400 leading-none truncate max-w-[200px] sm:max-w-md">
                {course.title}
              </p>
            </div>
          </div>
        </div>

        {/* Barra de Progreso Superior */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5 bg-zinc-100 dark:bg-zinc-800/80 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700">
            <span className="text-xs text-zinc-500 font-medium hidden sm:inline">Progreso:</span>
            <div className="w-20 sm:w-28 h-2.5 bg-zinc-300 dark:bg-zinc-700 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-agro-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-bold text-agro-600 dark:text-agro-400">
              {progressPercentage}%
            </span>
          </div>

          {/* Certificado si está al 100% */}
          {isCourseFinished && (
            <CertificateModal
              courseTitle={course.title}
              studentName={currentUser?.full_name || 'Estudiante Click Agro'}
              courseId={course.id}
              userId={currentUser?.id || 'uid'}
            />
          )}
        </div>
      </header>

      {/* 2. CONTENIDO PRINCIPAL: TODOS LOS CONTENIDOS DISPONIBLES */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* BANNER DE CABECERA DEL CURSO CON CONTROL GENERAL DE PROGRESO */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-agro-50 dark:bg-agro-950/40 text-agro-700 dark:text-agro-300 border border-agro-200 dark:border-agro-800">
                <Sparkles className="w-3.5 h-3.5 text-agro-500" />
                <span>Curso Completo • Acceso Ilimitado</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white leading-tight">
                {course.title}
              </h1>
              {course.description && (
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {course.description}
                </p>
              )}
            </div>

            {/* TARJETA DE CONTROL DE AVANCE */}
            <div className="bg-zinc-50 dark:bg-zinc-950/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 min-w-[260px] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Tu Avance en el Curso
                </span>
                <span className="text-base font-black text-agro-600 dark:text-agro-400">
                  {progressPercentage}%
                </span>
              </div>

              <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-agro-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>{completedCount} de {totalCount} completados</span>
                {isCourseFinished ? (
                  <span className="font-bold text-amber-500 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    ¡Completado!
                  </span>
                ) : (
                  <span>Marca los materiales utilizados</span>
                )}
              </div>

              {isSavingProgress && (
                <p className="text-[10px] text-agro-600 dark:text-agro-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Sincronizando progreso...</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN 1: CONTENIDO AUDIOVISUAL (CLASES EN VIDEO) */}
        {currentVideo && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Formación Audiovisual
                    </span>
                    {videosList.length > 1 && (
                      <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">
                        Clase {resolvedVideoIndex + 1} de {videosList.length}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                    {currentVideo.title}
                  </h3>
                </div>
              </div>

              {/* CHECKBOX DE CONTROL PARA EL VIDEO ACTUAL */}
              <button
                type="button"
                onClick={() => toggleItemCheckbox(`video-${currentVideo.id}`)}
                className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  completedItems.includes(`video-${currentVideo.id}`)
                    ? 'bg-agro-50 border-agro-300 text-agro-700 dark:bg-agro-950/40 dark:border-agro-700/60 dark:text-agro-300'
                    : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {completedItems.includes(`video-${currentVideo.id}`) ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-agro-600 dark:text-agro-400" />
                    <span>Clase Vista y Completada ✓</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 text-zinc-400" />
                    <span>Marcar Clase como Vista</span>
                  </>
                )}
              </button>
            </div>

            {/* SELECTOR INTERACTIVO DE CLASES / VIDEOS */}
            {videosList.length > 1 && (
              <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950/60 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-agro-500 fill-agro-500" />
                    Selecciona una clase para reproducir ({videosList.length} disponibles):
                  </span>

                  {/* Navegación rápida entre clases */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={resolvedVideoIndex <= 0}
                      onClick={() => {
                        if (resolvedVideoIndex > 0) {
                          const prevVid = videosList[resolvedVideoIndex - 1];
                          setSelectedVideoId(prevVid.id);
                          setActiveLessonId(prevVid.id);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      ← Anterior
                    </button>
                    <button
                      type="button"
                      disabled={resolvedVideoIndex >= videosList.length - 1}
                      onClick={() => {
                        if (resolvedVideoIndex < videosList.length - 1) {
                          const nextVid = videosList[resolvedVideoIndex + 1];
                          setSelectedVideoId(nextVid.id);
                          setActiveLessonId(nextVid.id);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {videosList.map((v, vIdx) => {
                    const isSelected = v.id === currentVideo.id;
                    const isWatched = completedItems.includes(`video-${v.id}`);

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVideoId(v.id);
                          setActiveLessonId(v.id);
                        }}
                        className={`text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-agro-50 dark:bg-agro-950/40 border-agro-500 ring-2 ring-agro-500/30 text-agro-900 dark:text-agro-200 font-bold shadow-xs'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-agro-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-black ${
                            isSelected
                              ? 'bg-agro-500 text-white'
                              : isWatched
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {vIdx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold leading-tight">
                            {v.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            {isSelected && (
                              <span className="text-agro-600 dark:text-agro-400 font-bold">
                                • Reproduciendo ahora
                              </span>
                            )}
                            {isWatched && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                                <Check className="w-3 h-3 inline" /> Vista
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* REPRODUCTOR */}
            <VideoPlayer
              youtubeId={currentVideo.url}
              title={currentVideo.title}
            />
          </div>
        )}

        {/* SECCIÓN 3: TODOS LOS MATERIALES DEL CURSO CON CONTROL POR CHECKBOX */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-6">
          
          {/* Cabecera del Módulo de Materiales */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-agro-600 dark:text-agro-400 uppercase tracking-wider mb-1">
                <Paperclip className="w-4 h-4" />
                <span>Materiales y Recursos del Curso</span>
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Todo el Material de Estudio Descargable
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Utiliza las casillas de verificación para marcar los materiales que ya consultaste o utilizaste en tu campo.
              </p>
            </div>

            {/* Acciones Masivas */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleAllMaterials(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                title="Marcar todos los materiales como utilizados"
              >
                <CheckCheck className="w-3.5 h-3.5 text-agro-500" />
                <span>Marcar todos</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleAllMaterials(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <span>Limpiar</span>
              </button>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Buscador */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar planillas, PDFs o guías..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-agro-500"
              />
            </div>

            {/* Filtros de Categoría */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'excel', label: 'Planillas Excel' },
                { id: 'pdf', label: 'Documentos PDF' },
                { id: 'video', label: 'Videos' },
                { id: 'doc', label: 'Documentos' },
                { id: 'archive', label: 'Comprimidos' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCategoryFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                    categoryFilter === f.id
                      ? 'bg-agro-500 text-white shadow-2xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* LISTA INTERACTIVA DE MATERIALES CON CHECKBOXES */}
          {filteredMaterials.length === 0 ? (
            <div className="py-12 px-4 text-center text-zinc-400 space-y-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <Paperclip className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-1" />
              <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">
                {materials.length === 0
                  ? 'No hay materiales adicionales cargados en este curso.'
                  : 'No se encontraron materiales que coincidan con la búsqueda.'}
              </p>
              <p className="text-xs text-zinc-400">
                {materials.length === 0
                  ? 'A medida que el docente agregue archivos, aparecerán listados aquí.'
                  : 'Prueba borrando el texto de búsqueda o cambiando el filtro seleccionado.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredMaterials.map((item) => {
                const isChecked = completedItems.includes(item.id);
                const { fileInfo } = item;

                return (
                  <div
                    key={item.id}
                    className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isChecked
                        ? 'bg-agro-50/60 dark:bg-agro-950/20 border-agro-400/60 dark:border-agro-800/70 shadow-2xs'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-agro-400/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'
                    }`}
                  >
                    {/* CHECKBOX A LA IZQUIERDA */}
                    <button
                      type="button"
                      onClick={() => toggleItemCheckbox(item.id)}
                      className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 mr-2 shrink-0 transition-colors"
                      title={isChecked ? 'Marcar como pendiente' : 'Marcar como utilizado'}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-agro-600 dark:text-agro-400" />
                      ) : (
                        <Square className="w-5 h-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
                      )}
                    </button>

                    {/* CONTENIDO DEL RECURSO */}
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${fileInfo.iconBg}`}>
                        {renderIcon(fileInfo.category)}
                      </div>
                      <div className="truncate">
                        <p className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                          isChecked
                            ? 'text-agro-900 dark:text-agro-200 line-through opacity-85'
                            : 'text-zinc-800 dark:text-zinc-200 group-hover:text-agro-600 dark:group-hover:text-agro-400'
                        }`}>
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border uppercase ${fileInfo.badgeBg}`}>
                            {fileInfo.extension}
                          </span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {fileInfo.label}
                          </span>
                          {isChecked && (
                            <span className="text-[10px] font-bold text-agro-600 dark:text-agro-400 bg-agro-100 dark:bg-agro-900/40 px-1.5 rounded">
                              ✓ Utilizado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* BOTÓN DE DESCARGA DIRECTA */}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white bg-zinc-100 hover:bg-agro-500 dark:bg-zinc-800 dark:hover:bg-agro-600 transition-all shrink-0 shadow-2xs"
                      title={`Descargar ${item.title}`}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECCIÓN 4: CONSULTAS Y DUDAS AL DOCENTE */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
            Espacio de Consultas Técnicas
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
            ¿Tienes dudas con respecto al material o a los casos de aplicación? Deja tu consulta aquí y el equipo docente te responderá.
          </p>

          <LessonComments
            lessonId={activeLessonId || course.id}
            currentUser={currentUser}
          />
        </div>
      </main>
    </div>
  );
}

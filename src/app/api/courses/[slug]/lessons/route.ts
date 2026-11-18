import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface RouteParams {
  params: {
    slug: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { slug } = params;

    // 1. Obtener token de autenticación del header Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          error: 'No autenticado. Debes iniciar sesión para acceder a las lecciones.',
          requires_auth: true 
        },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Sesión inválida o expirada.', requires_auth: true },
        { status: 401 }
      );
    }

    // 2. Buscar el curso por slug
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id, title, description, price, is_published')
      .eq('slug', slug)
      .maybeSingle();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'El curso solicitado no existe.' },
        { status: 404 }
      );
    }

    // 3. Verificar si el usuario tiene acceso aprobado (RLS / has_course_access o rol admin/teacher)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isMasterAdmin = user.email?.toLowerCase() === 'academiaclickagro@gmail.com';
    const isAdminOrTeacher = profile?.role === 'admin' || profile?.role === 'teacher' || isMasterAdmin;

    const { data: hasAccessData } = await supabaseAdmin
      .rpc('has_course_access', {
        p_course_id: course.id,
        p_user_id: user.id,
      });

    const isAuthorized = isAdminOrTeacher || Boolean(hasAccessData);

    // 4. Bloqueo estricto si no está matriculado ni es docente/admin
    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: 'Acceso restringido. No posees una inscripción activa para este curso.',
          is_enrolled: false,
          course: {
            id: course.id,
            title: course.title,
            description: course.description,
            price: course.price,
          },
        },
        { status: 403 }
      );
    }

    // 5. Usuario autorizado: Retornar las lecciones con material protegido y recursos descargables
    const { data: lessons, error: lessonsError } = await supabaseAdmin
      .from('lessons')
      .select('id, course_id, module_id, title, description, youtube_video_id, zoom_link, position, is_free_preview, created_at, lesson_resources(id, title, file_url)')
      .eq('course_id', course.id)
      .order('position', { ascending: true });

    if (lessonsError) {
      throw lessonsError;
    }

    // Obtener progreso completado
    const { data: progress } = await supabaseAdmin
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', user.id)
      .eq('completed', true);

    const completedLessonIds = new Set((progress || []).map((p: any) => p.lesson_id));

    const enrichedLessons = (lessons || []).map((l: any) => {
      const fromResources = (l.lesson_resources || []).map((r: any) => ({
        name: r.title,
        url: r.file_url,
      }));

      let fromLegacy: any[] = [];
      if (l.attachment_urls) {
        if (typeof l.attachment_urls === 'string') {
          try {
            fromLegacy = JSON.parse(l.attachment_urls);
          } catch {
            fromLegacy = [l.attachment_urls];
          }
        } else if (Array.isArray(l.attachment_urls)) {
          fromLegacy = l.attachment_urls;
        }
      }

      const combined = [...fromResources];
      fromLegacy.forEach((item: any) => {
        const url = typeof item === 'string' ? item : item.url;
        if (url && !combined.some((c: any) => c.url === url)) {
          combined.push(
            typeof item === 'string'
              ? { name: decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'Material'), url }
              : item
          );
        }
      });

      return {
        ...l,
        video_youtube_id: l.youtube_video_id || '',
        order_index: l.position || 0,
        completed: completedLessonIds.has(l.id),
        attachment_urls: combined,
      };
    });

    return NextResponse.json({
      course,
      lessons: enrichedLessons,
      is_enrolled: true,
    });
  } catch (error: any) {
    console.error('[API_COURSE_LESSONS_ERROR]', error);
    return NextResponse.json(
      { error: 'Error interno al consultar el curso', details: error?.message || error },
      { status: 500 }
    );
  }
}

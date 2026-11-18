import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/courses
 * Retorna todos los cursos o un curso específico con su lección y recursos completos
 * usando permisos administrativos de servicio (bypasseando RLS).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      // 1. Obtener curso específico
      const { data: course, error: courseErr } = await supabaseAdmin
        .from('courses')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (courseErr || !course) {
        return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
      }

      // 2. Obtener todas las lecciones asociadas ordenadas por posición
      const { data: lessons, error: lessonErr } = await supabaseAdmin
        .from('lessons')
        .select('id, title, youtube_video_id, position')
        .eq('course_id', id)
        .order('position', { ascending: true });

      const lesson = lessons?.[0] || null;
      let resources: any[] = [];

      // 3. Obtener recursos asociados a las lecciones del curso
      const lessonIds = (lessons || []).map((l: any) => l.id);
      if (lessonIds.length > 0) {
        const { data: resData, error: resErr } = await supabaseAdmin
          .from('lesson_resources')
          .select('id, title, file_url, created_at, lesson_id')
          .in('lesson_id', lessonIds);

        if (!resErr && resData) {
          resources = resData.map((r: any) => ({
            id: r.id,
            name: r.title,
            url: r.file_url,
          }));
        }
      }

      return NextResponse.json({
        success: true,
        course,
        lessons: lessons || [],
        lesson,
        resources,
      });
    }

    // Listado general de cursos para el panel admin
    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, courses: courses || [] });
  } catch (err: any) {
    console.error('[API_ADMIN_COURSES_GET_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Error al obtener cursos' }, { status: 500 });
  }
}

/**
 * POST /api/admin/courses
 * Crea o actualiza un curso junto con sus clases en video y recursos asociados en Supabase
 * usando permisos de servicio administrativo.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      title,
      slug,
      description,
      price,
      image_url,
      is_published,
      lessons = [],
      first_lesson_title,
      video_youtube_id,
      resources = [],
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'El título del curso es obligatorio.' }, { status: 400 });
    }

    const cleanSlug = (slug || title)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const coursePayload = {
      title: title.trim(),
      slug: cleanSlug,
      description: description || null,
      price: Number(price) || 0,
      cover_image: image_url || null,
      is_published: Boolean(is_published),
      updated_at: new Date().toISOString(),
    };

    // Normalizar lista de clases/lecciones a guardar
    let normalizedLessons: Array<{ id?: string; title: string; video_url: string }> = [];

    if (Array.isArray(lessons) && lessons.length > 0) {
      normalizedLessons = lessons.map((l: any, idx: number) => ({
        id: l.id ? String(l.id) : undefined,
        title: (l.title || '').trim() || `Clase ${idx + 1}`,
        video_url: (l.video_url || l.youtube_video_id || '').trim(),
      }));
    } else if (first_lesson_title || video_youtube_id) {
      normalizedLessons = [
        {
          title: (first_lesson_title || '').trim() || '1. Introducción al Programa',
          video_url: (video_youtube_id || '').trim(),
        },
      ];
    } else {
      normalizedLessons = [
        {
          title: '1. Introducción al Programa',
          video_url: '',
        },
      ];
    }

    let courseId = id;
    let primaryLessonId: string | null = null;

    if (courseId) {
      // 1. Actualizar curso existente
      const { error: updErr } = await supabaseAdmin
        .from('courses')
        .update(coursePayload)
        .eq('id', courseId);

      if (updErr) {
        console.error('[COURSES_UPDATE_ERROR]', updErr);
        return NextResponse.json({ error: `Error al actualizar curso: ${updErr.message}` }, { status: 500 });
      }

      // 2. Gestionar lecciones asociadas
      const { data: currentDbLessons } = await supabaseAdmin
        .from('lessons')
        .select('id')
        .eq('course_id', courseId);

      const incomingIds = new Set(normalizedLessons.filter((l) => Boolean(l.id)).map((l) => l.id!));
      const idsToDelete = (currentDbLessons || [])
        .map((l: any) => l.id)
        .filter((dbId: string) => !incomingIds.has(dbId));

      if (idsToDelete.length > 0) {
        await supabaseAdmin.from('lessons').delete().in('id', idsToDelete);
      }

      // Actualizar o insertar lecciones en el orden correspondiente
      for (let i = 0; i < normalizedLessons.length; i++) {
        const item = normalizedLessons[i];
        const position = i + 1;

        if (item.id) {
          await supabaseAdmin
            .from('lessons')
            .update({
              title: item.title,
              youtube_video_id: item.video_url || null,
              position,
            })
            .eq('id', item.id);

          if (i === 0) {
            primaryLessonId = item.id;
          }
        } else {
          const { data: newLesson } = await supabaseAdmin
            .from('lessons')
            .insert({
              course_id: courseId,
              title: item.title,
              description: description || null,
              youtube_video_id: item.video_url || null,
              position,
              is_free_preview: true,
            })
            .select('id')
            .single();

          if (i === 0 && newLesson?.id) {
            primaryLessonId = newLesson.id;
          }
        }
      }

      // Si aún no tenemos primaryLessonId, obtener la primera por posición
      if (!primaryLessonId) {
        const { data: firstFound } = await supabaseAdmin
          .from('lessons')
          .select('id')
          .eq('course_id', courseId)
          .order('position', { ascending: true })
          .limit(1);
        primaryLessonId = firstFound?.[0]?.id || null;
      }

      // 3. Sincronizar recursos descargables en lesson_resources
      if (primaryLessonId) {
        // Borrar recursos anteriores de las lecciones del curso
        const allLessonIds = (currentDbLessons || []).map((l: any) => l.id);
        if (allLessonIds.length > 0) {
          await supabaseAdmin.from('lesson_resources').delete().in('lesson_id', allLessonIds);
        }

        if (Array.isArray(resources) && resources.length > 0) {
          const resPayload = resources
            .filter((r: any) => Boolean(r && (r.url || r.file_url)))
            .map((r: any) => ({
              lesson_id: primaryLessonId,
              title: r.name || r.title || 'Material de Estudio',
              file_url: r.url || r.file_url,
            }));

          if (resPayload.length > 0) {
            const { error: insertResErr } = await supabaseAdmin
              .from('lesson_resources')
              .insert(resPayload);

            if (insertResErr) {
              console.error('[RESOURCES_INSERT_ERROR]', insertResErr);
              return NextResponse.json({ error: `Error al guardar recursos: ${insertResErr.message}` }, { status: 500 });
            }
          }
        }
      }
    } else {
      // 1. Crear nuevo curso
      const { data: newCourse, error: createErr } = await supabaseAdmin
        .from('courses')
        .insert({
          ...coursePayload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createErr) {
        console.error('[COURSES_CREATE_ERROR]', createErr);
        return NextResponse.json({ error: `Error al crear curso: ${createErr.message}` }, { status: 500 });
      }

      courseId = newCourse.id;

      // 2. Crear las lecciones del curso
      const newLessonsPayload = normalizedLessons.map((l, idx) => ({
        course_id: courseId,
        title: l.title,
        description: description || null,
        youtube_video_id: l.video_url || null,
        position: idx + 1,
        is_free_preview: true,
      }));

      const { data: createdLessons, error: lessonError } = await supabaseAdmin
        .from('lessons')
        .insert(newLessonsPayload)
        .select('id, position');

      if (lessonError) {
        console.error('[LESSON_CREATE_ERROR]', lessonError);
      } else {
        const sortedCreated = (createdLessons || []).sort((a: any, b: any) => a.position - b.position);
        primaryLessonId = sortedCreated?.[0]?.id || null;
      }

      // 3. Asociar recursos descargables
      if (primaryLessonId && Array.isArray(resources) && resources.length > 0) {
        const resPayload = resources
          .filter((r: any) => Boolean(r && (r.url || r.file_url)))
          .map((r: any) => ({
            lesson_id: primaryLessonId,
            title: r.name || r.title || 'Material de Estudio',
            file_url: r.url || r.file_url,
          }));

        if (resPayload.length > 0) {
          const { error: insertResErr } = await supabaseAdmin
            .from('lesson_resources')
            .insert(resPayload);

          if (insertResErr) {
            console.error('[RESOURCES_INSERT_ERROR]', insertResErr);
            return NextResponse.json({ error: `Error al guardar recursos: ${insertResErr.message}` }, { status: 500 });
          }
        }
      }
    }

    return NextResponse.json({ success: true, courseId });
  } catch (err: any) {
    console.error('[COURSES_API_EXCEPTION]', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/courses
 * Alterna el estado de publicación de un curso
 */
export async function PATCH(req: NextRequest) {
  try {
    const { id, is_published } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Falta el ID del curso.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('courses')
      .update({ is_published, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/courses?id=...
 * Elimina un curso y sus dependencias
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID del curso a eliminar.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

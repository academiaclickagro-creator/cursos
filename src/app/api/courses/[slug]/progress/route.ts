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

    // 1. Obtener token del header Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ completedItems: [] }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ completedItems: [] }, { status: 401 });
    }

    // 2. Obtener el curso por slug
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!course) {
      return NextResponse.json({ completedItems: [] }, { status: 404 });
    }

    // 3. Obtener el progreso guardado en user_metadata
    const userMetadata = user.user_metadata || {};
    const coursesProgress = userMetadata.courses_progress || {};
    const courseProgress = coursesProgress[course.id] || [];

    return NextResponse.json({
      courseId: course.id,
      completedItems: Array.isArray(courseProgress) ? courseProgress : [],
    });
  } catch (error: any) {
    console.error('[API_GET_PROGRESS_ERROR]', error);
    return NextResponse.json({ completedItems: [] }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { slug } = params;

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, completed, allCompletedItems } = body;

    // Obtener curso
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!course) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    const userMetadata = user.user_metadata || {};
    const coursesProgress = userMetadata.courses_progress || {};
    let currentCompleted: string[] = Array.isArray(coursesProgress[course.id])
      ? [...coursesProgress[course.id]]
      : [];

    if (Array.isArray(allCompletedItems)) {
      currentCompleted = allCompletedItems;
    } else if (itemId) {
      if (completed) {
        if (!currentCompleted.includes(itemId)) {
          currentCompleted.push(itemId);
        }
      } else {
        currentCompleted = currentCompleted.filter((id) => id !== itemId);
      }
    }

    // Actualizar metadata del usuario
    const updatedCoursesProgress = {
      ...coursesProgress,
      [course.id]: currentCompleted,
    };

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...userMetadata,
        courses_progress: updatedCoursesProgress,
      },
    });

    return NextResponse.json({
      success: true,
      courseId: course.id,
      completedItems: currentCompleted,
    });
  } catch (error: any) {
    console.error('[API_POST_PROGRESS_ERROR]', error);
    return NextResponse.json({ error: 'Error guardando progreso' }, { status: 500 });
  }
}

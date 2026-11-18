import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Cursos publicados
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select('id, title, slug, description, cover_image, price, is_published, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    // 2. Combos publicados
    const { data: combos, error: combosError } = await supabaseAdmin
      .from('combos')
      .select('id, title, slug, description, cover_image, price, is_published, created_at, combo_courses(course_id, courses(id, title))')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    // Mapear cover_image a image_url para compatibilidad uniforme en el frontend
    const mappedCourses = (courses || []).map((c) => ({
      ...c,
      image_url: c.cover_image || null,
    }));

    const mappedCombos = (combos || []).map((cb) => ({
      ...cb,
      image_url: cb.cover_image || null,
    }));

    return NextResponse.json({
      courses: mappedCourses,
      combos: mappedCombos,
    });
  } catch (error: any) {
    console.error('[API_CATALOG_ERROR]', error);
    return NextResponse.json(
      { courses: [], combos: [], error: error?.message || 'Error al obtener catálogo' },
      { status: 500 }
    );
  }
}

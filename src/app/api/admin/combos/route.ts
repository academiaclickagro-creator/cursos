import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/combos
 * Crea un combo de cursos y sus vínculos en combo_courses con permisos de servicio
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      slug,
      description,
      price,
      image_url,
      is_published,
      selectedCourseIds = [],
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'El título del combo es obligatorio.' }, { status: 400 });
    }

    if (selectedCourseIds.length < 2) {
      return NextResponse.json({ error: 'Un combo debe incluir al menos 2 cursos.' }, { status: 400 });
    }

    const cleanSlug = (slug || title)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const { data: newCombo, error: comboErr } = await supabaseAdmin
      .from('combos')
      .insert({
        title: title.trim(),
        slug: cleanSlug,
        description: description || null,
        price: Number(price) || 0,
        cover_image: image_url || null,
        is_published: Boolean(is_published),
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (comboErr) {
      console.error('[COMBOS_CREATE_ERROR]', comboErr);
      return NextResponse.json({ error: `Error al crear combo: ${comboErr.message}` }, { status: 500 });
    }

    // Vincular en tabla intermedia combo_courses
    const comboCoursesData = selectedCourseIds.map((cId: string) => ({
      combo_id: newCombo.id,
      course_id: cId,
    }));

    const { error: linkErr } = await supabaseAdmin
      .from('combo_courses')
      .insert(comboCoursesData);

    if (linkErr) {
      console.error('[COMBO_COURSES_LINK_ERROR]', linkErr);
      return NextResponse.json({ error: `Error al vincular cursos al combo: ${linkErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, comboId: newCombo.id });
  } catch (err: any) {
    console.error('[COMBOS_API_EXCEPTION]', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor.' }, { status: 500 });
  }
}

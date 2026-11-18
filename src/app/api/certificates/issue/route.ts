import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { course_id, user_id, certificate_code } = body;

    if (!course_id || !user_id || !certificate_code) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos (course_id, user_id, certificate_code)' },
        { status: 400 }
      );
    }

    // Verificar si el usuario completó el 100% de las lecciones antes de emitir
    const { data: hasAccess } = await supabaseAdmin
      .rpc('has_course_access', {
        p_course_id: course_id,
        p_user_id: user_id,
      });

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'El usuario no posee matrícula aprobada para este curso.' },
        { status: 403 }
      );
    }

    // Verificar si ya existía un certificado emitido
    const { data: existingCert } = await supabaseAdmin
      .from('certificates')
      .select('id, certificate_code, student_name, course_title, issued_at')
      .eq('course_id', course_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingCert) {
      return NextResponse.json({
        success: true,
        already_issued: true,
        certificate: existingCert,
      });
    }

    // Obtener nombres para campos student_name y course_title si no vienen en body
    let finalStudentName = body.student_name;
    let finalCourseTitle = body.course_title;

    if (!finalStudentName) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', user_id)
        .maybeSingle();
      finalStudentName = prof?.full_name || prof?.email?.split('@')[0] || 'Estudiante Click Agro';
    }

    if (!finalCourseTitle) {
      const { data: c } = await supabaseAdmin
        .from('courses')
        .select('title')
        .eq('id', course_id)
        .maybeSingle();
      finalCourseTitle = c?.title || 'Programa Académico Click Agro';
    }

    // Registrar nuevo certificado en base de datos real
    const { data: newCert, error } = await supabaseAdmin
      .from('certificates')
      .insert({
        certificate_code,
        course_id,
        user_id,
        student_name: finalStudentName,
        course_title: finalCourseTitle,
      })
      .select('id, certificate_code, student_name, course_title, issued_at')
      .single();

    if (error) throw error;

    console.log(`[CERTIFICADO_EMITIDO] Certificado ${certificate_code} registrado para usuario ${user_id}`);

    return NextResponse.json({
      success: true,
      certificate: newCert,
    });
  } catch (error: any) {
    console.error('[ISSUE_CERT_ERROR]', error);
    return NextResponse.json(
      { error: 'Error al registrar emisión de certificado', details: error?.message || error },
      { status: 500 }
    );
  }
}

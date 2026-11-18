import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendNewQuestionNotificationEmail } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lesson_id, question, user_name } = body;

    if (!lesson_id || !question) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // Obtener detalles de la lección y del curso asociado
    const { data: lesson } = await supabaseAdmin
      .from('lessons')
      .select('id, title, course_id, courses(id, title)')
      .eq('id', lesson_id)
      .maybeSingle();

    const courseTitle = (lesson?.courses as any)?.title || 'Curso Click Agro';
    const lessonTitle = lesson?.title || 'Lección';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const adminUrl = `${appUrl}/admin/preguntas`;

    // Obtener email del profesor configurado en site_settings (o fallback a ENV)
    let teacherAlertEmail = process.env.ADMIN_ALERT_EMAIL || 'profesores@clickagro.com.ar';
    try {
      const { data: settingRow } = await supabaseAdmin
        .from('site_settings')
        .select('value')
        .eq('key', 'teacher_alert_email')
        .maybeSingle();

      if (settingRow?.value) {
        teacherAlertEmail = settingRow.value;
      }
    } catch (sErr) {
      console.warn('No se pudo consultar teacher_alert_email de site_settings, usando fallback:', sErr);
    }

    // Disparar email al docente a través de Resend
    await sendNewQuestionNotificationEmail({
      teacherEmail: teacherAlertEmail,
      studentName: user_name || 'Alumno',
      courseTitle,
      lessonTitle,
      questionContent: question,
      adminUrl,
    });

    return NextResponse.json({ success: true, message: 'Alerta enviada al docente con éxito' });
  } catch (error: any) {
    console.error('[NOTIFY_QUESTION_ERROR]', error);
    return NextResponse.json({ error: 'Error al procesar notificación', details: error?.message }, { status: 500 });
  }
}

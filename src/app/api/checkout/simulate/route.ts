import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWelcomeStudentEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      course_id, 
      combo_id, 
      coupon_code, 
      user_email, 
      first_name, 
      last_name, 
      full_name, 
      phone 
    } = body;

    if (!user_email || !user_email.includes('@')) {
      return NextResponse.json(
        { error: 'Debes proporcionar un correo electrónico válido.' },
        { status: 400 }
      );
    }

    if (!course_id && !combo_id) {
      return NextResponse.json(
        { error: 'Debe especificarse un curso o un combo para simular la compra.' },
        { status: 400 }
      );
    }

    const cleanEmail = user_email.trim().toLowerCase();
    const buyerName = full_name?.trim() || [first_name, last_name].filter(Boolean).join(' ').trim() || cleanEmail.split('@')[0];
    const buyerPhone = phone?.trim() || null;

    // 1. Obtener datos del Curso o Combo
    let targetTitle = '';
    let targetSlug = '';
    let originalPrice = 0;
    let courseData: any = null;
    let comboData: any = null;

    if (course_id) {
      const { data: c, error: cErr } = await supabaseAdmin
        .from('courses')
        .select('id, title, slug, price, is_published')
        .eq('id', course_id)
        .maybeSingle();

      if (cErr || !c) {
        return NextResponse.json({ error: 'El curso especificado no existe.' }, { status: 404 });
      }

      courseData = c;
      targetTitle = c.title;
      targetSlug = c.slug;
      originalPrice = Number(c.price) || 0;
    } else if (combo_id) {
      const { data: cb, error: cbErr } = await supabaseAdmin
        .from('combos')
        .select('id, title, slug, price, is_published')
        .eq('id', combo_id)
        .maybeSingle();

      if (cbErr || !cb) {
        return NextResponse.json({ error: 'El combo especificado no existe.' }, { status: 404 });
      }

      comboData = cb;
      targetTitle = cb.title;
      targetSlug = cb.slug;
      originalPrice = Number(cb.price) || 0;
    }

    // 2. Procesar cupón si existe
    let finalPrice = originalPrice;
    let appliedCouponId: string | null = null;

    if (coupon_code && coupon_code.trim()) {
      const cleanCoupon = coupon_code.trim().replace(/\s+/g, '');
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .ilike('code', cleanCoupon)
        .maybeSingle();

      if (coupon && coupon.is_active) {
        appliedCouponId = coupon.id;
        if (Number(coupon.discount_percent || 0) > 0) {
          finalPrice = originalPrice - (originalPrice * Number(coupon.discount_percent)) / 100;
        } else if (Number(coupon.discount_amount || 0) > 0) {
          finalPrice = originalPrice - Number(coupon.discount_amount);
        }
        finalPrice = Math.max(0, Math.round(finalPrice * 100) / 100);

        // Incrementar uso del cupón
        await supabaseAdmin
          .from('coupons')
          .update({ uses_count: (coupon.uses_count || 0) + 1 })
          .eq('id', coupon.id);
      }
    }

    // 3. Obtener o crear cuenta del usuario en Supabase Auth
    const tempPassword = 'SimulacionClickAgro2026!';
    let userId: string;

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
      // Actualizar contraseña y metadatos del usuario con los datos provistos en la compra
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        user_metadata: {
          first_name: first_name?.trim() || null,
          last_name: last_name?.trim() || null,
          full_name: buyerName,
          phone: buyerPhone,
          role: existingProfile.role || 'student',
        },
      });

      // Actualizar nombre completo en profiles
      await supabaseAdmin.from('profiles').update({
        full_name: buyerName,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    } else {
      const { data: authCreated, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: first_name?.trim() || null,
          last_name: last_name?.trim() || null,
          full_name: buyerName,
          phone: buyerPhone,
          role: 'student',
        },
      });

      if (createAuthErr || !authCreated?.user) {
        console.error('[SIMULATION_AUTH_ERROR]', createAuthErr);
        return NextResponse.json(
          { error: `Error al registrar usuario en Supabase: ${createAuthErr?.message}` },
          { status: 500 }
        );
      }

      userId = authCreated.user.id;

      // Asegurar registro en profiles con el nombre y apellido real
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: cleanEmail,
        full_name: buyerName,
        role: 'student',
      }, { onConflict: 'id' });
    }

    // 4. Crear la matrícula aprobada en la base de datos
    const simulatedPaymentId = `SIMULADO_MP_${Date.now()}`;

    if (combo_id) {
      // a) Registro de matrícula del Combo
      await supabaseAdmin.from('enrollments').insert({
        user_id: userId,
        combo_id: combo_id,
        course_id: null,
        payment_id: simulatedPaymentId,
        payment_status: 'approved',
        amount_paid: finalPrice,
        coupon_id: appliedCouponId,
        created_at: new Date().toISOString(),
      });

      // b) Enrolar en todos los cursos incluidos del combo
      const { data: comboCourses } = await supabaseAdmin
        .from('combo_courses')
        .select('course_id, courses(slug)')
        .eq('combo_id', combo_id);

      if (comboCourses && comboCourses.length > 0) {
        const batch = comboCourses.map((cc: any) => ({
          user_id: userId,
          course_id: cc.course_id,
          combo_id: combo_id,
          payment_id: simulatedPaymentId,
          payment_status: 'approved',
          amount_paid: 0.0,
          coupon_id: appliedCouponId,
          created_at: new Date().toISOString(),
        }));

        await supabaseAdmin.from('enrollments').insert(batch);

        // Si es combo, tomar el slug del primer curso incluido para el botón directo
        const firstCourse: any = comboCourses[0]?.courses;
        if (firstCourse) {
          targetSlug = Array.isArray(firstCourse) ? (firstCourse[0]?.slug || '') : (firstCourse?.slug || '');
        }
      }
    } else {
      // Matrícula de Curso Individual
      const { error: enrollErr } = await supabaseAdmin.from('enrollments').insert({
        user_id: userId,
        course_id: course_id,
        combo_id: null,
        payment_id: simulatedPaymentId,
        payment_status: 'approved',
        amount_paid: finalPrice,
        coupon_id: appliedCouponId,
        created_at: new Date().toISOString(),
      });

      if (enrollErr) {
        console.error('[SIMULATION_ENROLL_ERROR]', enrollErr);
        return NextResponse.json(
          { error: `Error al registrar matrícula: ${enrollErr.message}` },
          { status: 500 }
        );
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const directClassroomUrl = targetSlug ? `${appUrl}/dashboard/cursos/${targetSlug}` : `${appUrl}/dashboard`;

    // Enviar correo de bienvenida con el nombre y apellido del alumno si Resend está configurado
    try {
      await sendWelcomeStudentEmail({
        email: cleanEmail,
        fullName: buyerName,
        courseOrComboTitle: targetTitle,
        classroomUrl: directClassroomUrl,
        temporaryPassword: tempPassword,
      });
    } catch (mailErr) {
      console.warn('[SIMULATION_EMAIL_NOTICE] No se pudo enviar el correo o Resend no está configurado:', mailErr);
    }

    const redirectUrl = `/checkout/success?simulated=true&slug=${encodeURIComponent(targetSlug)}&title=${encodeURIComponent(targetTitle)}&buyer_name=${encodeURIComponent(buyerName)}`;

    return NextResponse.json({
      success: true,
      simulated: true,
      email: cleanEmail,
      temp_password: tempPassword,
      course_slug: targetSlug,
      course_title: targetTitle,
      redirect_url: redirectUrl,
    });
  } catch (err: any) {
    console.error('[CHECKOUT_SIMULATE_EXCEPTION]', err);
    return NextResponse.json(
      { error: err?.message || 'Error interno al simular el pago.' },
      { status: 500 }
    );
  }
}

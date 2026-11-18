import { NextResponse } from 'next/server';
import { Payment } from 'mercadopago';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { mpClient } from '@/lib/mercadopago';
import { sendWelcomeStudentEmail } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Mercado Pago envía el ID en query params (IPN) o en el body (Webhooks v1/v2)
    const topic = searchParams.get('topic') || searchParams.get('type');
    let paymentId = searchParams.get('data.id') || searchParams.get('id');

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      // El body puede venir vacío en notificaciones tipo IPN tradicional
      body = {};
    }

    if (!paymentId) {
      paymentId = body?.data?.id || body?.id;
    }

    const eventType = topic || body?.type || body?.action;

    console.log(`[WEBHOOK_MP] Evento recibido: ${eventType}, Payment ID: ${paymentId}`);

    // Si la notificación no corresponde a un pago o no tiene ID, respondemos 200 para evitar reintentos innecesarios
    if (!paymentId) {
      console.warn('[WEBHOOK_MP] Notificación sin identificador de pago.');
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    // 1. Consultar el estado verificado del pago (o usar simulación en modo dev/test)
    let paymentData: any;

    if (process.env.NODE_ENV !== 'production' && body?._is_simulation) {
      console.log(`[WEBHOOK_MP_SIMULATION] Modo simulación activado para ID: ${paymentId}`);
      paymentData = body._simulation_payment_data || {
        id: paymentId,
        status: body.status || 'approved',
        status_detail: 'accredited',
        transaction_amount: body.amount || 45000,
        payer: {
          email: body.email || 'alumno.prueba@clickagro.com.ar',
          first_name: body.first_name || 'Carlos',
          last_name: body.last_name || 'Gómez',
        },
        metadata: {
          user_email: body.email || 'alumno.prueba@clickagro.com.ar',
          course_id: body.course_id || null,
          combo_id: body.combo_id || null,
          coupon_id: body.coupon_id || null,
          amount_paid: body.amount || 45000,
        },
      };
    } else {
      const paymentInstance = new Payment(mpClient);
      try {
        paymentData = await paymentInstance.get({ id: Number(paymentId) });
      } catch (mpErr: any) {
        console.error(`[WEBHOOK_MP] Error al consultar pago ${paymentId} en Mercado Pago:`, mpErr);
        // Responder 200 si el recurso no existe o 500 para reintento si es fallo de red
        return NextResponse.json({ error: 'No se pudo obtener el pago de Mercado Pago' }, { status: 200 });
      }
    }

    const paymentStatus = paymentData?.status;
    const paymentIdStr = paymentData?.id?.toString() || paymentId.toString();

    // Si el pago fue cancelado, reembolsado o contracargado, revocar inscripciones existentes
    if (paymentStatus === 'refunded' || paymentStatus === 'charged_back' || paymentStatus === 'cancelled') {
      console.warn(`[WEBHOOK_MP] Pago ${paymentIdStr} ha sido ${paymentStatus}. Revocando acceso a inscripciones.`);
      await supabaseAdmin
        .from('enrollments')
        .update({ payment_status: 'rejected' })
        .eq('payment_id', paymentIdStr);

      return NextResponse.json({ 
        received: true, 
        status: paymentStatus, 
        action: 'access_revoked' 
      }, { status: 200 });
    }

    // Validación estricta: Si el estado es 'pending' o 'rejected', NUNCA crear usuario ni enrolar
    if (paymentStatus === 'pending' || paymentStatus === 'in_process') {
      console.log(`[WEBHOOK_MP] Pago ${paymentIdStr} pendiente/en proceso. No se otorga acceso aún.`);
      return NextResponse.json({ received: true, status: paymentStatus, granted: false }, { status: 200 });
    }

    if (paymentStatus === 'rejected') {
      console.warn(`[WEBHOOK_MP] Pago ${paymentIdStr} rechazado (${paymentData?.status_detail}). No se crea usuario ni matrícula.`);
      return NextResponse.json({ received: true, status: 'rejected', granted: false }, { status: 200 });
    }

    if (paymentStatus !== 'approved') {
      console.log(`[WEBHOOK_MP] Pago ${paymentIdStr} en estado no aprobatorio: '${paymentStatus}'. Sin acción.`);
      return NextResponse.json({ received: true, status: paymentStatus }, { status: 200 });
    }

    // 2. Control de Idempotencia: Verificar si este payment_id ya fue procesado
    const { data: existingEnrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('payment_id', paymentIdStr)
      .limit(1);

    if (existingEnrollment && existingEnrollment.length > 0) {
      console.log(`[WEBHOOK_MP] El pago ${paymentIdStr} ya fue procesado previamente.`);
      return NextResponse.json({ received: true, already_processed: true }, { status: 200 });
    }

    // 3. Extraer metadata de la preferencia guardada en el pago
    const metadata = paymentData.metadata || {};
    let externalRefData: any = {};
    if (paymentData.external_reference) {
      try {
        externalRefData = JSON.parse(paymentData.external_reference);
      } catch {
        // Formato simple de string
      }
    }

    const buyerEmail = (metadata.user_email || externalRefData.user_email || paymentData.payer?.email)?.trim().toLowerCase();
    const courseId = metadata.course_id || externalRefData.course_id || null;
    const comboId = metadata.combo_id || externalRefData.combo_id || null;
    const couponId = metadata.coupon_id || externalRefData.coupon_id || null;
    const amountPaid = Number(paymentData.transaction_amount || metadata.amount_paid || 0);

    if (!buyerEmail) {
      console.error('[WEBHOOK_MP] No se pudo determinar el email del comprador para el pago:', paymentIdStr);
      return NextResponse.json({ error: 'Falta email del comprador' }, { status: 200 });
    }

    console.log(`[WEBHOOK_MP] Procesando aprobación para ${buyerEmail} (Curso: ${courseId}, Combo: ${comboId})`);

    // 4. Buscar o crear usuario en Supabase Auth
    let userId: string;

    const firstName = metadata.first_name || externalRefData.first_name || paymentData.payer?.first_name || '';
    const lastName = metadata.last_name || externalRefData.last_name || paymentData.payer?.last_name || '';
    const buyerPhone = metadata.phone || externalRefData.phone || paymentData.payer?.phone?.number || '';
    const buyerName = metadata.full_name || externalRefData.full_name || [firstName, lastName].filter(Boolean).join(' ') || [paymentData.payer?.first_name, paymentData.payer?.last_name].filter(Boolean).join(' ') || buyerEmail.split('@')[0];

    // Consulta en tabla profiles (sincronizada con auth.users)
    const { data: existingProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('email', buyerEmail)
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
      console.log(`[WEBHOOK_MP] Usuario existente encontrado: ${userId}`);

      // Actualizar metadatos del usuario con los datos de compra
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          full_name: buyerName,
          phone: buyerPhone || undefined,
          role: existingProfile.role || 'student',
        },
      });

      // Asegurar actualización en profiles
      await supabaseAdmin
        .from('profiles')
        .update({
          full_name: buyerName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } else {
      console.log(`[WEBHOOK_MP] Usuario ${buyerEmail} no existe en Supabase. Creando cuenta...`);

      // Contraseña segura autogenerada (el usuario puede restablecerla por email)
      const generatedPassword = `ClickAgro_${Math.random().toString(36).slice(-8)}!${Date.now().toString(36)}`;

      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: buyerEmail,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName || null,
          last_name: lastName || null,
          full_name: buyerName,
          phone: buyerPhone || null,
          role: 'student',
        },
      });

      if (createUserError || !newUser?.user) {
        console.error('[WEBHOOK_MP] Error al crear usuario en Supabase Auth:', createUserError);
        throw new Error(`Fallo al crear usuario: ${createUserError?.message}`);
      }

      userId = newUser.user.id;
      console.log(`[WEBHOOK_MP] Usuario creado exitosamente con ID: ${userId}`);

      // Aseguramos perfil en public.profiles
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          email: buyerEmail,
          full_name: buyerName,
          role: 'student',
        }, { onConflict: 'id' });
    }

    // 5. Registrar inscripciones (enrollments)
    if (comboId) {
      console.log(`[WEBHOOK_MP] Registrando inscripción de combo ${comboId} para usuario ${userId}`);

      // a) Registro maestro del combo
      const { error: comboEnrollErr } = await supabaseAdmin
        .from('enrollments')
        .insert({
          user_id: userId,
          combo_id: comboId,
          course_id: null,
          payment_id: paymentIdStr,
          payment_status: 'approved',
          amount_paid: amountPaid,
          coupon_id: couponId,
        });

      if (comboEnrollErr) {
        console.error('[WEBHOOK_MP] Error al registrar enrollment del combo:', comboEnrollErr);
      }

      // b) Obtener todos los cursos que integran dicho combo y registrarlos individualmente
      const { data: comboCourses, error: ccErr } = await supabaseAdmin
        .from('combo_courses')
        .select('course_id')
        .eq('combo_id', comboId);

      if (ccErr) {
        console.error('[WEBHOOK_MP] Error al consultar cursos del combo:', ccErr);
      } else if (comboCourses && comboCourses.length > 0) {
        const individualEnrollments = comboCourses.map((cc) => ({
          user_id: userId,
          course_id: cc.course_id,
          combo_id: comboId,
          payment_id: paymentIdStr,
          payment_status: 'approved',
          amount_paid: 0.00, // Marcado con 0.00 ya que el total fue asignado al combo
          coupon_id: couponId,
        }));

        const { error: batchErr } = await supabaseAdmin
          .from('enrollments')
          .insert(individualEnrollments);

        if (batchErr) {
          console.error('[WEBHOOK_MP] Error al registrar los cursos del combo:', batchErr);
        } else {
          console.log(`[WEBHOOK_MP] ${individualEnrollments.length} cursos del combo vinculados al usuario con éxito.`);
        }
      }
    } else if (courseId) {
      console.log(`[WEBHOOK_MP] Registrando inscripción directa al curso ${courseId} para usuario ${userId}`);

      const { error: courseEnrollErr } = await supabaseAdmin
        .from('enrollments')
        .insert({
          user_id: userId,
          course_id: courseId,
          combo_id: null,
          payment_id: paymentIdStr,
          payment_status: 'approved',
          amount_paid: amountPaid,
          coupon_id: couponId,
        });

      if (courseEnrollErr) {
        console.error('[WEBHOOK_MP] Error al registrar enrollment del curso:', courseEnrollErr);
        throw courseEnrollErr;
      }
    }

    // 6. Si se utilizó un cupón de descuento, incrementar el contador uses_count
    if (couponId) {
      console.log(`[WEBHOOK_MP] Incrementando contador de uso para el cupón ID: ${couponId}`);
      
      const { data: couponData } = await supabaseAdmin
        .from('coupons')
        .select('uses_count')
        .eq('id', couponId)
        .single();

      if (couponData) {
        const currentUses = couponData.uses_count || 0;
        await supabaseAdmin
          .from('coupons')
          .update({ uses_count: currentUses + 1 })
          .eq('id', couponId);
      }
    }

    // 7. Enviar Email Transaccional con Resend (Credenciales y enlace directo al aula)
    try {
      let productTitle = 'Programa en Academia Click Agro';
      let classroomUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`;

      if (courseId) {
        const { data: cData } = await supabaseAdmin
          .from('courses')
          .select('title, slug')
          .eq('id', courseId)
          .single();
        if (cData) {
          productTitle = cData.title;
          classroomUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/cursos/${cData.slug}`;
        }
      } else if (comboId) {
        const { data: cbData } = await supabaseAdmin
          .from('combos')
          .select('title')
          .eq('id', comboId)
          .single();
        if (cbData) {
          productTitle = `Combo Especial: ${cbData.title}`;
        }
      }

      await sendWelcomeStudentEmail({
        email: buyerEmail,
        fullName: buyerName,
        courseOrComboTitle: productTitle,
        classroomUrl,
      });
    } catch (mailErr) {
      console.error('[WEBHOOK_MP] Error al enviar email transaccional:', mailErr);
    }

    console.log(`[WEBHOOK_MP] Pago ${paymentIdStr} procesado e inscripciones confirmadas.`);

    // 8. Responder 200 OK inmediatamente a Mercado Pago
    return NextResponse.json({ success: true, message: 'Pago procesado exitosamente' }, { status: 200 });

  } catch (error: any) {
    console.error('[WEBHOOK_MP_CRITICAL_ERROR]', error);
    // Respondemos con 200 para evitar loops infinitos de reintentos en errores lógicos,
    // o 500 solo si deseamos que Mercado Pago reintente el envío más tarde.
    return NextResponse.json(
      { error: 'Error interno en el webhook', details: error?.message || error },
      { status: 500 }
    );
  }
}

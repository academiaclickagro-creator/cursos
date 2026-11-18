import { NextResponse } from 'next/server';
import { Preference } from 'mercadopago';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { mpClient } from '@/lib/mercadopago';

interface PreferenceRequestBody {
  course_id?: string;
  combo_id?: string;
  coupon_code?: string;
  user_email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
}

export async function POST(request: Request) {
  try {
    const body: PreferenceRequestBody = await request.json();
    const { course_id, combo_id, coupon_code, user_email, first_name, last_name, full_name, phone } = body;

    // 1. Validaciones iniciales de entrada
    if (!user_email || typeof user_email !== 'string' || !user_email.includes('@')) {
      return NextResponse.json(
        { error: 'El email del comprador (user_email) es obligatorio y debe ser válido.' },
        { status: 400 }
      );
    }

    if (!course_id && !combo_id) {
      return NextResponse.json(
        { error: 'Debe especificar un course_id o un combo_id para procesar el pago.' },
        { status: 400 }
      );
    }

    let itemTitle = '';
    let itemDescription = '';
    let originalPrice = 0;
    let itemId = '';

    // 2. Obtener información y precio oficial del Curso o Combo en Supabase
    if (course_id) {
      const { data: course, error: courseError } = await supabaseAdmin
        .from('courses')
        .select('id, title, description, price, is_published')
        .eq('id', course_id)
        .single();

      if (courseError || !course) {
        return NextResponse.json(
          { error: 'El curso especificado no fue encontrado.' },
          { status: 404 }
        );
      }

      if (!course.is_published) {
        return NextResponse.json(
          { error: 'El curso no se encuentra disponible para la venta.' },
          { status: 400 }
        );
      }

      itemTitle = `Curso: ${course.title}`;
      itemDescription = course.description || 'Acceso completo al curso en Academia Click Agro';
      originalPrice = Number(course.price);
      itemId = course.id;
    } else if (combo_id) {
      const { data: combo, error: comboError } = await supabaseAdmin
        .from('combos')
        .select('id, title, description, price, is_published')
        .eq('id', combo_id)
        .single();

      if (comboError || !combo) {
        return NextResponse.json(
          { error: 'El combo especificado no fue encontrado.' },
          { status: 404 }
        );
      }

      if (!combo.is_published) {
        return NextResponse.json(
          { error: 'El combo de cursos no se encuentra disponible para la venta.' },
          { status: 400 }
        );
      }

      itemTitle = `Combo: ${combo.title}`;
      itemDescription = combo.description || 'Acceso completo al paquete de cursos en Academia Click Agro';
      originalPrice = Number(combo.price);
      itemId = combo.id;
    }

    // 3. Validación y cálculo de cupón de descuento
    let finalPrice = originalPrice;
    let appliedCouponId: string | null = null;
    let discountAmount = 0;

    if (coupon_code && coupon_code.trim() !== '') {
      // Sanitizar cupón: eliminar espacios al inicio, fin e intermedios accidentales
      const cleanCode = coupon_code.trim().replace(/\s+/g, '');

      const { data: coupon, error: couponError } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .ilike('code', cleanCode)
        .maybeSingle();

      if (couponError || !coupon) {
        return NextResponse.json(
          { error: `El cupón '${cleanCode.toUpperCase()}' no es válido o no existe.` },
          { status: 400 }
        );
      }

      // Validar si está activo
      if (!coupon.is_active) {
        return NextResponse.json(
          { error: `El cupón '${cleanCode.toUpperCase()}' se encuentra inactivo.` },
          { status: 400 }
        );
      }

      // Validar fecha de expiración
      const expiryDate = coupon.valid_until || coupon.expires_at;
      if (expiryDate && new Date(expiryDate) < new Date()) {
        return NextResponse.json(
          { error: `El cupón '${cleanCode.toUpperCase()}' ha expirado.` },
          { status: 400 }
        );
      }

      // Validar límite de usos
      if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
        return NextResponse.json(
          { error: `El cupón '${cleanCode.toUpperCase()}' ha alcanzado el límite máximo de usos.` },
          { status: 400 }
        );
      }

      // Calcular monto con descuento
      appliedCouponId = coupon.id;
      if (Number(coupon.discount_percent || 0) > 0) {
        discountAmount = (originalPrice * Number(coupon.discount_percent)) / 100;
      } else if (Number(coupon.discount_amount || 0) > 0) {
        discountAmount = Number(coupon.discount_amount);
      } else if (coupon.discount_type === 'percentage') {
        discountAmount = (originalPrice * Number(coupon.discount_value || 0)) / 100;
      } else if (coupon.discount_value) {
        discountAmount = Number(coupon.discount_value);
      }

      // Asegurar que el precio final no sea negativo
      finalPrice = Math.max(0, originalPrice - discountAmount);
      // Redondear a 2 decimales para evitar problemas con pasarelas de pago
      finalPrice = Math.round(finalPrice * 100) / 100;
    }

    // Mercado Pago requiere que el monto unitario sea superior a 0 para generar checkout
    if (finalPrice <= 0) {
      return NextResponse.json(
        { 
          error: 'El monto final es $0.00. Si este contenido es gratuito o cubierto al 100% por cupón, debe registrarse directamente sin pasar por Mercado Pago.',
          is_free: true,
          coupon_id: appliedCouponId
        },
        { status: 400 }
      );
    }

    // 4. Configurar URLs de retorno y Webhook
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const notificationUrl = `${appUrl}/api/webhooks/mercadopago`;

    // 5. Crear la Preferencia de Pago en Mercado Pago
    const preferenceInstance = new Preference(mpClient);

    const preferenceResult = await preferenceInstance.create({
      body: {
        items: [
          {
            id: itemId,
            title: itemTitle,
            description: itemDescription.substring(0, 250),
            quantity: 1,
            unit_price: finalPrice,
            currency_id: 'ARS',
          },
        ],
        payer: {
          email: user_email.trim().toLowerCase(),
          name: first_name?.trim() || undefined,
          surname: last_name?.trim() || undefined,
          phone: phone?.trim() ? { number: phone.trim() } : undefined,
        },
        // Metadata persistente para recuperación en Webhook
        metadata: {
          user_email: user_email.trim().toLowerCase(),
          first_name: first_name?.trim() || null,
          last_name: last_name?.trim() || null,
          full_name: full_name?.trim() || [first_name?.trim(), last_name?.trim()].filter(Boolean).join(' ') || null,
          phone: phone?.trim() || null,
          course_id: course_id || null,
          combo_id: combo_id || null,
          coupon_id: appliedCouponId,
          original_price: originalPrice,
          amount_paid: finalPrice,
        },
        external_reference: JSON.stringify({
          user_email: user_email.trim().toLowerCase(),
          first_name: first_name?.trim() || '',
          last_name: last_name?.trim() || '',
          full_name: full_name?.trim() || [first_name?.trim(), last_name?.trim()].filter(Boolean).join(' '),
          phone: phone?.trim() || '',
          course_id: course_id || null,
          combo_id: combo_id || null,
          coupon_id: appliedCouponId,
        }),
        back_urls: {
          success: `${appUrl}/checkout/success?buyer_name=${encodeURIComponent(full_name?.trim() || [first_name?.trim(), last_name?.trim()].filter(Boolean).join(' ') || '')}`,
          failure: `${appUrl}/checkout/failure`,
          pending: `${appUrl}/checkout/pending`,
        },
        auto_return: 'approved',
        notification_url: notificationUrl,
        statement_descriptor: 'CLICK AGRO',
      },
    });

    return NextResponse.json({
      preference_id: preferenceResult.id,
      init_point: preferenceResult.init_point,
      sandbox_init_point: preferenceResult.sandbox_init_point,
      original_price: originalPrice,
      discount_applied: discountAmount,
      final_price: finalPrice,
    });
  } catch (error: any) {
    console.error('[CHECKOUT_PREFERENCE_ERROR]', error);
    return NextResponse.json(
      { 
        error: 'Error interno al generar la preferencia de pago', 
        details: error?.message || error 
      },
      { status: 500 }
    );
  }
}

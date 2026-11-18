import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendTestEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipientEmail, apiKey, fromEmail, authUserId } = body;

    // 1. Validar autorización de administrador
    if (authUserId) {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('role, email')
        .eq('id', authUserId)
        .maybeSingle();

      if (process.env.NODE_ENV === 'production' && authUserId !== 'dev-admin-id') {
        if (!userProfile || userProfile.role !== 'admin') {
          return NextResponse.json(
            { success: false, error: 'Acceso no autorizado. Se requiere rol de administrador.' },
            { status: 403 }
          );
        }
      }
    }

    const targetEmail = recipientEmail || 'admin@clickagro.com.ar';

    // 2. Disparar el envío de prueba a través de Resend
    const result = await sendTestEmail({
      recipientEmail: targetEmail,
      customApiKey: apiKey,
      customFromEmail: fromEmail,
    });

    if (result?.error) {
      return NextResponse.json(
        {
          success: false,
          error: `Error reportado por la API de Resend: ${result.error.message || JSON.stringify(result.error)}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `¡Correo de prueba enviado con éxito a ${targetEmail}!`,
      data: result?.data,
    });
  } catch (err: any) {
    console.error('Error al probar conexión con Resend:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Error al conectar con los servidores de Resend',
      },
      { status: 500 }
    );
  }
}

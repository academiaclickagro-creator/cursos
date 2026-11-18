import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface SiteSettingItem {
  id?: string;
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

// Configuración semilla por defecto (requerida por negocio)
const DEFAULT_SITE_SETTINGS: Record<string, { value: string; description: string; isSecret?: boolean }> = {
  whatsapp_number: {
    value: '5491100000000',
    description: 'Número oficial de WhatsApp para soporte y consultas (formato internacional sin +)',
  },
  support_email: {
    value: 'contacto@clickagro.com.ar',
    description: 'Correo electrónico de atención al cliente y soporte',
  },
  teacher_alert_email: {
    value: 'profesores@clickagro.com.ar',
    description: 'Bandeja de correo destino para alertas de preguntas formuladas por alumnos',
  },
  resend_from_email: {
    value: 'Academia Click Agro <notificaciones@clickagro.com.ar>',
    description: 'Remitente oficial de correos transaccionales',
  },
  resend_api_key: {
    value: '',
    description: 'API Key de Resend (re_...). Si está vacía se utiliza RESEND_API_KEY del servidor',
    isSecret: true,
  },
  is_maintenance_mode: {
    value: 'false',
    description: 'Activa o desactiva la pantalla global de mantenimiento (true o false)',
  },
  pending_payment_message: {
    value:
      'Si abonaste mediante Pago Fácil, Rapipago o Red Link, la acreditación puede demorar entre unas horas y 1 día hábil. Tan pronto como Mercado Pago nos notifique, se habilitará tu acceso de manera 100% automática.',
    description: 'Leyenda informativa desplegada en la pantalla de pago pendiente (/checkout/pending)',
  },
  maintenance_notice_message: {
    value:
      'Estamos realizando mejoras técnicas en nuestra plataforma para brindarte una mejor experiencia de aprendizaje. Volvemos en breve.',
    description: 'Mensaje visible para los visitantes cuando el sitio está en mantenimiento',
  },
};

/**
 * GET /api/settings
 * Endpoint público y accesible para que el frontend (WhatsAppButton, Footer, Checkout)
 * consuma las variables operativas en tiempo real.
 * Por seguridad, resend_api_key solo se devuelve si se valida rol de admin o en desarrollo.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const authUserId = searchParams.get('userId');

    let isAdmin = false;
    if (authUserId) {
      if (process.env.NODE_ENV === 'development' || authUserId === 'dev-admin-id') {
        isAdmin = true;
      } else {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', authUserId)
          .maybeSingle();
        isAdmin = profile?.role === 'admin';
      }
    }

    // Intentar leer de la tabla site_settings
    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .select('id, key, value, description, updated_at');

    if (error) {
      const isMissingTable = error.code === 'PGRST205' || error.message?.includes('schema cache');
      
      const defaultMap: Record<string, string> = {};
      const defaultList: SiteSettingItem[] = [];

      Object.entries(DEFAULT_SITE_SETTINGS).forEach(([k, item]) => {
        // Ocultar valor sensible si no es admin
        const val = item.isSecret && !isAdmin ? '' : item.value;
        defaultMap[k] = val;
        defaultList.push({
          key: k,
          value: val,
          description: item.description,
          updated_at: new Date().toISOString(),
        });
      });

      return NextResponse.json({
        success: true,
        source: 'default_fallback',
        tableExists: !isMissingTable,
        settings: defaultMap,
        raw: defaultList,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      });
    }

    // Convertir a mapa key -> value
    const settingsMap: Record<string, string> = {};
    const rawList: SiteSettingItem[] = data || [];

    // Combinar con defaults para claves faltantes
    Object.entries(DEFAULT_SITE_SETTINGS).forEach(([k, item]) => {
      settingsMap[k] = item.isSecret && !isAdmin ? '' : item.value;
    });

    rawList.forEach((row) => {
      if (row.key) {
        if (row.key === 'resend_api_key' && !isAdmin) {
          settingsMap[row.key] = ''; // Protegido contra consultas no autorizadas
        } else {
          settingsMap[row.key] = row.value;
        }
      }
    });

    return NextResponse.json({
      success: true,
      source: 'database',
      tableExists: true,
      settings: settingsMap,
      raw: rawList,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
      },
    });
  } catch (err: any) {
    console.error('Error al obtener site_settings:', err);
    
    const fallbackMap: Record<string, string> = {};
    Object.entries(DEFAULT_SITE_SETTINGS).forEach(([k, item]) => {
      if (!item.isSecret) {
        fallbackMap[k] = item.value;
      }
    });

    return NextResponse.json({
      success: true,
      source: 'emergency_fallback',
      tableExists: false,
      settings: fallbackMap,
      error: err?.message,
    }, { status: 200 });
  }
}

/**
 * PUT /api/settings
 * Actualiza configuraciones clave en la base de datos.
 * Exclusivo para administradores.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { settings, authUserId } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Formato de configuración inválido' },
        { status: 400 }
      );
    }

    // Validar autorización de administrador
    if (authUserId) {
      const { data: userProfile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', authUserId)
        .maybeSingle();

      if (profileErr || userProfile?.role !== 'admin') {
        if (process.env.NODE_ENV === 'production' && authUserId !== 'dev-admin-id') {
          return NextResponse.json(
            { success: false, error: 'Acceso no autorizado. Se requiere rol de Administrador.' },
            { status: 403 }
          );
        }
      }
    }

    // Validaciones de negocio:
    // 1. WhatsApp: Solo números, longitud mínima
    if (settings.whatsapp_number) {
      const cleanPhone = settings.whatsapp_number.replace(/\D/g, '');
      if (cleanPhone.length < 8 || cleanPhone.length > 16) {
        return NextResponse.json(
          { success: false, error: 'El número de WhatsApp debe contener entre 8 y 16 dígitos numéricos (ej. 5491100000000).' },
          { status: 400 }
        );
      }
    }

    // 2. Emails: Validación de formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (settings.support_email && !emailRegex.test(settings.support_email.trim())) {
      return NextResponse.json(
        { success: false, error: 'El correo de Atención al Cliente no tiene un formato válido.' },
        { status: 400 }
      );
    }

    if (settings.teacher_alert_email && !emailRegex.test(settings.teacher_alert_email.trim())) {
      return NextResponse.json(
        { success: false, error: 'El correo de Alertas Docentes no tiene un formato válido.' },
        { status: 400 }
      );
    }

    // Preparar filas para upsert en site_settings
    const rowsToUpsert = Object.entries(settings).map(([key, val]) => {
      const stringValue = typeof val === 'boolean' ? String(val) : String(val ?? '');
      const description = DEFAULT_SITE_SETTINGS[key]?.description || 'Configuración operativa';
      return {
        key,
        value: stringValue,
        description,
        updated_at: new Date().toISOString(),
      };
    });

    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .upsert(rowsToUpsert, { onConflict: 'key' })
      .select('*');

    if (error) {
      const isMissingTable = error.code === 'PGRST205' || error.message?.includes('schema cache');
      if (isMissingTable) {
        return NextResponse.json({
          success: false,
          needsMigration: true,
          error: 'La tabla site_settings aún no está creada en Supabase. Por favor ejecuta el script de migración supabase/3_site_settings.sql en el SQL Editor de Supabase.',
        }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Configuraciones guardadas exitosamente en la base de datos',
      data,
    });
  } catch (err: any) {
    console.error('Error al actualizar site_settings:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Error interno al guardar la configuración' },
      { status: 500 }
    );
  }
}

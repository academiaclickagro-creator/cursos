import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  // 1. Verificación Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const hasSupabaseUrl = Boolean(supabaseUrl && supabaseUrl.startsWith('https://'));
  const hasSupabaseAnonKey = Boolean(supabaseAnonKey && supabaseAnonKey.length > 20);
  const hasSupabaseServiceKey = Boolean(supabaseServiceKey && supabaseServiceKey.length > 30);

  let supabaseDbConnected = false;
  let supabaseLatencyMs = 0;
  let supabaseError: string | null = null;
  let siteSettingsTableFound = false;

  // Claves guardadas en la base de datos
  let dbResendApiKey = '';
  let dbResendFromEmail = '';

  try {
    const pingStart = Date.now();
    const { error: pingError } = await supabaseAdmin.from('courses').select('id').limit(1);
    supabaseLatencyMs = Date.now() - pingStart;

    if (!pingError) {
      supabaseDbConnected = true;
    } else {
      supabaseError = pingError.message;
    }

    // Verificar si la tabla site_settings ya fue creada y leer variables
    const { data: dbSettings, error: settingsTableErr } = await supabaseAdmin
      .from('site_settings')
      .select('key, value');

    if (!settingsTableErr && dbSettings) {
      siteSettingsTableFound = true;
      const keyRow = dbSettings.find((r) => r.key === 'resend_api_key');
      const fromRow = dbSettings.find((r) => r.key === 'resend_from_email');
      if (keyRow?.value) dbResendApiKey = keyRow.value;
      if (fromRow?.value) dbResendFromEmail = fromRow.value;
    }
  } catch (err: any) {
    supabaseError = err.message;
  }

  // 2. Verificación Mercado Pago
  const mpToken = process.env.MP_ACCESS_TOKEN || '';
  const isMpTokenPlaceholder = !mpToken || mpToken.includes('tu_access_token') || mpToken.includes('placeholder');
  const hasMpToken = Boolean(mpToken && !isMpTokenPlaceholder);
  const isMpSandbox = mpToken.startsWith('TEST-');
  const isMpLive = mpToken.startsWith('APP_USR-');

  // 3. Verificación Resend
  const envResendKey = process.env.RESEND_API_KEY || '';
  const isEnvResendPlaceholder = !envResendKey || envResendKey.includes('tu_resend') || envResendKey.includes('placeholder');

  // Clave activa: prioridad base de datos si existe y no es vacía
  const activeResendKey = dbResendApiKey.trim() !== '' ? dbResendApiKey.trim() : (isEnvResendPlaceholder ? '' : envResendKey);
  const hasActiveResendKey = Boolean(activeResendKey && activeResendKey.length > 10 && !activeResendKey.includes('placeholder'));
  const keySource = dbResendApiKey.trim() !== '' ? 'Base de Datos (site_settings)' : (hasActiveResendKey ? 'Variables de Entorno (.env.local)' : 'Ninguna');

  const resendFromEmail = dbResendFromEmail.trim() !== '' 
    ? dbResendFromEmail.trim() 
    : (process.env.RESEND_FROM_EMAIL || 'Academia Click Agro <notificaciones@clickagro.com.ar>');

  const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL || 'profesores@clickagro.com.ar';

  // 4. Variables de Aplicación
  const nodeEnv = process.env.NODE_ENV || 'development';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    checkedInMs: Date.now() - startTime,
    services: {
      supabase: {
        name: 'Supabase Database & Auth',
        configured: hasSupabaseUrl && hasSupabaseAnonKey && hasSupabaseServiceKey,
        healthy: supabaseDbConnected,
        latencyMs: supabaseLatencyMs,
        tableSiteSettingsExists: siteSettingsTableFound,
        urlPreview: hasSupabaseUrl ? `${supabaseUrl.substring(0, 24)}...` : 'No configurado',
        hasAnonKey: hasSupabaseAnonKey,
        hasServiceRole: hasSupabaseServiceKey,
        error: supabaseError,
      },
      mercadopago: {
        name: 'Mercado Pago Checkout Pro',
        configured: hasMpToken,
        isSandbox: isMpSandbox,
        isLive: isMpLive,
        status: hasMpToken 
          ? (isMpLive ? 'Modo Producción (Live)' : 'Modo Sandbox (Test)') 
          : (isMpTokenPlaceholder ? 'Clave de Prueba / Placeholder' : 'Sin configurar'),
        tokenPreview: hasMpToken ? `${mpToken.substring(0, 10)}...` : 'No configurado',
      },
      resend: {
        name: 'Resend Transaccional',
        configured: hasActiveResendKey,
        keySource,
        status: hasActiveResendKey ? `API Key Operativa (${keySource})` : 'Clave Pendiente / No configurada',
        fromEmail: resendFromEmail,
        alertEmail: adminAlertEmail,
        tokenPreview: hasActiveResendKey ? `${activeResendKey.substring(0, 6)}...` : 'Sin configurar',
      },
      environment: {
        nodeEnv,
        appUrl,
        uptime: process.uptime(),
      },
    },
  });
}

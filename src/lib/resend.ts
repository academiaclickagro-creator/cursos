import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const fallbackResendApiKey = process.env.RESEND_API_KEY || 're_placeholder_key';
const fallbackSenderEmail = process.env.RESEND_FROM_EMAIL || 'Academia Click Agro <notificaciones@clickagro.com.ar>';

// Instancia fallback para compatibilidad retroactiva
export const resend = new Resend(fallbackResendApiKey);

/**
 * Obtiene dinámicamente la configuración activa de Resend:
 * 1. Prioriza las credenciales guardadas en la tabla 'site_settings' en Supabase.
 * 2. Si están vacías o incompletas, utiliza como respaldo las variables de entorno.
 */
export async function getResendConfig() {
  let apiKey = process.env.RESEND_API_KEY || '';
  let fromEmail = process.env.RESEND_FROM_EMAIL || fallbackSenderEmail;

  try {
    const { data: rows } = await supabaseAdmin
      .from('site_settings')
      .select('key, value')
      .in('key', ['resend_api_key', 'resend_from_email']);

    if (rows && rows.length > 0) {
      const keyRow = rows.find((r) => r.key === 'resend_api_key');
      const fromRow = rows.find((r) => r.key === 'resend_from_email');

      if (keyRow?.value && keyRow.value.trim() !== '') {
        apiKey = keyRow.value.trim();
      }
      if (fromRow?.value && fromRow.value.trim() !== '') {
        fromEmail = fromRow.value.trim();
      }
    }
  } catch (err) {
    console.warn('[RESEND_CONFIG] No se pudo leer site_settings, utilizando variables de entorno:', err);
  }

  const activeKey = apiKey || fallbackResendApiKey;
  return {
    apiKey: activeKey,
    fromEmail,
    client: new Resend(activeKey),
  };
}

/**
 * 1. Email de Bienvenida y Acceso tras Compra Aprobada
 */
export async function sendWelcomeStudentEmail({
  email,
  fullName,
  courseOrComboTitle,
  classroomUrl,
  temporaryPassword,
}: {
  email: string;
  fullName: string;
  courseOrComboTitle: string;
  classroomUrl: string;
  temporaryPassword?: string;
}) {
  try {
    const { client, fromEmail } = await getResendConfig();

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: #13462f; padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0 0; font-size: 13px; color: #a7f3d0; text-transform: uppercase; letter-spacing: 1px; }
          .body { padding: 32px 24px; }
          .highlight { background: #f0fdf4; border-left: 4px solid #28a76b; padding: 16px; border-radius: 8px; margin: 20px 0; }
          .btn { display: inline-block; background-color: #28a76b; color: #ffffff !important; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 10px; text-decoration: none; text-align: center; margin: 20px 0; }
          .credentials { background: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 13px; margin: 20px 0; }
          .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ACADEMIA CLICK AGRO</h1>
            <p>Confirmación de Inscripción Oficial</p>
          </div>
          <div class="body">
            <h2>¡Hola, ${fullName}! 👋</h2>
            <p>Tu pago ha sido procesado con éxito y tu matrícula ya se encuentra activa.</p>
            
            <div class="highlight">
              <strong style="color: #166534; font-size: 16px;">Programa Adquirido:</strong>
              <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 600; color: #0f172a;">${courseOrComboTitle}</p>
            </div>

            ${temporaryPassword ? `
              <div class="credentials">
                <strong>Tus datos de acceso a la plataforma:</strong><br>
                • <b>Email:</b> ${email}<br>
                • <b>Contraseña temporal:</b> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${temporaryPassword}</code><br>
                <small style="color: #64748b; display: block; margin-top: 6px;">(Te recomendamos cambiarla en tu primer ingreso desde tu perfil).</small>
              </div>
            ` : `
              <p>Puedes acceder de inmediato con tus credenciales habituales.</p>
            `}

            <div style="text-align: center;">
              <a href="${classroomUrl}" class="btn">Ingresar al Aula Virtual</a>
            </div>

            <p style="font-size: 13px; color: #64748b;">
              Si tienes alguna consulta técnica o inconveniente para entrar, responde a este correo y nuestro equipo de soporte te asistirá.
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Academia Click Agro. Todos los derechos reservados.
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await client.emails.send({
      from: fromEmail,
      to: email,
      subject: `¡Bienvenido a Click Agro! Acceso a "${courseOrComboTitle}"`,
      html: htmlContent,
    });

    console.log(`[RESEND] Email de bienvenida enviado a ${email}. ID: ${result.data?.id}`);
    return result;
  } catch (error) {
    console.error('[RESEND_WELCOME_ERROR]', error);
    return null;
  }
}

/**
 * 2. Alerta al Docente/Admin cuando un alumno publica una nueva pregunta
 */
export async function sendNewQuestionNotificationEmail({
  teacherEmail = process.env.ADMIN_ALERT_EMAIL || 'profesores@clickagro.com.ar',
  studentName,
  courseTitle,
  lessonTitle,
  questionContent,
  adminUrl,
}: {
  teacherEmail?: string;
  studentName: string;
  courseTitle: string;
  lessonTitle?: string;
  questionContent: string;
  adminUrl: string;
}) {
  try {
    const { client, fromEmail } = await getResendConfig();

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: #0f172a; padding: 24px; text-align: center; color: #ffffff; }
          .badge { background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; }
          .body { padding: 28px 24px; }
          .quote { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; font-style: italic; color: #334155; margin: 16px 0; }
          .btn { display: inline-block; background-color: #28a76b; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="badge">Nueva Consulta en el Aula</span>
            <h2 style="margin: 10px 0 0 0; color: #ffffff;">Academia Click Agro</h2>
          </div>
          <div class="body">
            <p>El estudiante <b>${studentName}</b> ha realizado una pregunta en:</p>
            <p style="margin: 4px 0;">📚 <b>Curso:</b> ${courseTitle}</p>
            ${lessonTitle ? `<p style="margin: 4px 0;">🎬 <b>Lección:</b> ${lessonTitle}</p>` : ''}

            <div class="quote">
              "${questionContent}"
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${adminUrl}" class="btn">Responder en el Panel Docente</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await client.emails.send({
      from: fromEmail,
      to: teacherEmail,
      subject: `[Consulta Docente] ${studentName} preguntó en "${courseTitle}"`,
      html: htmlContent,
    });

    console.log(`[RESEND] Notificación enviada al docente (${teacherEmail}). ID: ${result.data?.id}`);
    return result;
  } catch (error) {
    console.error('[RESEND_QUESTION_ALERT_ERROR]', error);
    return null;
  }
}

/**
 * 3. Email de Prueba para Validar Conexión y API Key de Resend desde /admin/configuracion
 */
export async function sendTestEmail({
  recipientEmail,
  customApiKey,
  customFromEmail,
}: {
  recipientEmail: string;
  customApiKey?: string;
  customFromEmail?: string;
}) {
  const { apiKey: currentApiKey, fromEmail: currentFromEmail } = await getResendConfig();

  const activeKey = (customApiKey && customApiKey.trim() !== '') ? customApiKey.trim() : currentApiKey;
  const activeFrom = (customFromEmail && customFromEmail.trim() !== '') ? customFromEmail.trim() : currentFromEmail;

  if (!activeKey || activeKey.includes('placeholder') || activeKey.length < 10) {
    throw new Error('La API Key de Resend no está configurada o es inválida.');
  }

  const client = new Resend(activeKey);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background: #13462f; padding: 28px 24px; text-align: center; color: #ffffff; }
        .body { padding: 32px 24px; }
        .badge { display: inline-block; background-color: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px; }
        .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; font-size: 13px; line-height: 1.6; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0; font-size: 20px;">ACADEMIA CLICK AGRO</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #a7f3d0; text-transform: uppercase;">Diagnóstico de Conectividad</p>
        </div>
        <div class="body">
          <span class="badge">✓ Prueba de Conexión Exitosa</span>
          <h3 style="margin: 0 0 8px 0; color: #0f172a;">¡Tu integración con Resend está funcionando!</h3>
          <p style="font-size: 14px; color: #475569; margin: 0 0 16px 0;">
            Este es un correo de prueba enviado desde el <strong>Panel Administrativo de Configuración Global</strong> de Academia Click Agro.
          </p>

          <div class="box">
            <strong>Detalles del Envío:</strong><br>
            • <b>Remitente utilizado:</b> ${activeFrom}<br>
            • <b>Destinatario verificado:</b> ${recipientEmail}<br>
            • <b>Fecha y hora:</b> ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })} (Hora Argentina)<br>
            • <b>Estado:</b> Credencial de Resend autenticada con éxito.
          </div>

          <p style="font-size: 13px; color: #64748b; margin: 0;">
            A partir de ahora, las confirmaciones de matrícula, accesos automáticos y alertas a docentes se despacharán a través de esta configuración.
          </p>
        </div>
        <div class="footer">
          Academia Click Agro • Panel de Administración Central
        </div>
      </div>
    </body>
    </html>
  `;

  const result = await client.emails.send({
    from: activeFrom,
    to: recipientEmail,
    subject: '✓ [Prueba de Conexión] Integración de Resend Activa - Academia Click Agro',
    html: htmlContent,
  });

  return result;
}

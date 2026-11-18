'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Phone,
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Database,
  CreditCard,
  Send,
  Server,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Sparkles,
  Radio,
  Eye,
  EyeOff,
  Zap,
  CheckCheck
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type TabType = 'contact' | 'resend' | 'business' | 'system';

interface SystemStatus {
  timestamp: string;
  checkedInMs: number;
  services: {
    supabase: {
      name: string;
      configured: boolean;
      healthy: boolean;
      latencyMs: number;
      tableSiteSettingsExists: boolean;
      urlPreview: string;
      hasAnonKey: boolean;
      hasServiceRole: boolean;
      error: string | null;
    };
    mercadopago: {
      name: string;
      configured: boolean;
      isSandbox: boolean;
      isLive: boolean;
      status: string;
      tokenPreview: string;
    };
    resend: {
      name: string;
      configured: boolean;
      keySource?: string;
      status: string;
      fromEmail: string;
      alertEmail: string;
      tokenPreview: string;
    };
    environment: {
      nodeEnv: string;
      appUrl: string;
      uptime: number;
    };
  };
}

interface ToastState {
  show: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}

export default function AdminConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<TabType>('contact');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingResend, setTestingResend] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estados de Formulario
  const [whatsappNumber, setWhatsappNumber] = useState('5491100000000');
  const [supportEmail, setSupportEmail] = useState('contacto@clickagro.com.ar');
  const [teacherAlertEmail, setTeacherAlertEmail] = useState('profesores@clickagro.com.ar');
  
  // Resend
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromEmail, setResendFromEmail] = useState('Academia Click Agro <notificaciones@clickagro.com.ar>');
  const [showResendKey, setShowResendKey] = useState(false);

  // Negocio y Leyendas
  const [pendingPaymentMessage, setPendingPaymentMessage] = useState(
    'Si abonaste mediante Pago Fácil, Rapipago o Red Link, la acreditación puede demorar entre unas horas y 1 día hábil. Tan pronto como Mercado Pago nos notifique, se habilitará tu acceso de manera 100% automática.'
  );
  const [maintenanceNoticeMessage, setMaintenanceNoticeMessage] = useState(
    'Estamos realizando mejoras técnicas en nuestra plataforma para brindarte una mejor experiencia de aprendizaje. Volvemos en breve.'
  );
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Estado de Errores de Validación
  const [validationErrors, setValidationErrors] = useState<{
    whatsapp?: string;
    supportEmail?: string;
    teacherAlertEmail?: string;
    resendApiKey?: string;
  }>({});

  // Diagnóstico del Sistema
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [checkingSystem, setCheckingSystem] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Feedback Toast
  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: 'success',
    title: '',
    message: '',
  });

  const showToast = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 5000);
  };

  // Carga inicial de datos de configuración y usuario
  const loadSettings = async () => {
    setLoading(true);
    try {
      // 1. Obtener usuario actual
      const { data: authData } = await supabaseBrowser.auth.getUser();
      const user = authData?.user || { id: 'dev-admin-id', email: 'admin@clickagro.com.ar' };
      setCurrentUser(user);

      // 2. Obtener configuraciones del backend
      const res = await fetch(`/api/settings?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.settings) {
          const s = data.settings;
          if (s.whatsapp_number) setWhatsappNumber(s.whatsapp_number);
          if (s.support_email) setSupportEmail(s.support_email);
          if (s.teacher_alert_email) setTeacherAlertEmail(s.teacher_alert_email);
          if (s.resend_from_email) setResendFromEmail(s.resend_from_email);
          if (s.resend_api_key !== undefined) setResendApiKey(s.resend_api_key);
          if (s.pending_payment_message) setPendingPaymentMessage(s.pending_payment_message);
          if (s.maintenance_notice_message) setMaintenanceNoticeMessage(s.maintenance_notice_message);
          if (s.is_maintenance_mode !== undefined) {
            setIsMaintenanceMode(s.is_maintenance_mode === 'true');
          }
        }
      }
    } catch (err: any) {
      console.error('Error cargando configuraciones:', err);
      showToast('warning', 'Aviso de Conexión', 'Se cargaron los valores predeterminados de contingencia.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar estado de salud del sistema
  const checkSystemHealth = async () => {
    setCheckingSystem(true);
    try {
      const res = await fetch('/api/admin/system-status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (err) {
      console.error('Error al comprobar estado del sistema:', err);
    } finally {
      setCheckingSystem(false);
    }
  };

  useEffect(() => {
    loadSettings();
    checkSystemHealth();
  }, []);

  // Validaciones en cliente
  const validateForm = (): boolean => {
    const errors: {
      whatsapp?: string;
      supportEmail?: string;
      teacherAlertEmail?: string;
      resendApiKey?: string;
    } = {};

    // Teléfono: solo dígitos, longitud entre 8 y 16
    const cleanPhone = whatsappNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8 || cleanPhone.length > 16) {
      errors.whatsapp = 'Ingresa un número internacional válido (ej: 5491100000000, 8 a 16 dígitos sin espacios ni guiones).';
    }

    // Email soporte
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!supportEmail || !emailRegex.test(supportEmail.trim())) {
      errors.supportEmail = 'Ingresa un correo electrónico de soporte válido (ej: contacto@clickagro.com.ar).';
    }

    // Email alertas profesores
    if (!teacherAlertEmail || !emailRegex.test(teacherAlertEmail.trim())) {
      errors.teacherAlertEmail = 'Ingresa un correo válido para alertas de profesores.';
    }

    // API Key de Resend (si se completó, validar formato re_...)
    if (resendApiKey.trim() !== '' && !resendApiKey.startsWith('re_')) {
      errors.resendApiKey = 'Las API Keys de Resend comienzan con el prefijo "re_" (ej: re_12345678...).';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Guardar configuración
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Validación Fallida', 'Por favor corrige los campos señalados antes de continuar.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        settings: {
          whatsapp_number: whatsappNumber.replace(/\D/g, ''),
          support_email: supportEmail.trim(),
          teacher_alert_email: teacherAlertEmail.trim(),
          resend_from_email: resendFromEmail.trim(),
          resend_api_key: resendApiKey.trim(),
          is_maintenance_mode: isMaintenanceMode ? 'true' : 'false',
          pending_payment_message: pendingPaymentMessage.trim(),
          maintenance_notice_message: maintenanceNoticeMessage.trim(),
        },
        authUserId: currentUser?.id,
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.needsMigration) {
          showToast(
            'warning',
            'Migración Pendiente en Supabase',
            'La tabla site_settings aún no está creada en PostgreSQL. Por favor ejecuta el script SQL provisto en la pestaña Estado del Sistema.'
          );
          setActiveTab('system');
          return;
        }
        throw new Error(data?.error || 'No se pudo guardar la configuración.');
      }

      showToast(
        'success',
        '¡Configuración Guardada!',
        'Las variables operativas y credenciales se sincronizaron con éxito en la plataforma.'
      );
      checkSystemHealth();
    } catch (err: any) {
      console.error('Error al guardar:', err);
      showToast('error', 'Error al Guardar', err?.message || 'Ocurrió un error inesperado al actualizar la base de datos.');
    } finally {
      setSaving(false);
    }
  };

  // Probar conexión con Resend
  const handleTestResend = async () => {
    const adminDestEmail = currentUser?.email || 'admin@clickagro.com.ar';

    setTestingResend(true);
    try {
      const res = await fetch('/api/admin/resend/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: adminDestEmail,
          apiKey: resendApiKey.trim(),
          fromEmail: resendFromEmail.trim(),
          authUserId: currentUser?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'La prueba de envío de Resend falló.');
      }

      showToast(
        'success',
        '¡Prueba Exitosa con Resend!',
        `Se despachó el correo de comprobación a ${adminDestEmail}. Revisa tu bandeja de entrada.`
      );
      checkSystemHealth();
    } catch (err: any) {
      console.error('Error en prueba de Resend:', err);
      showToast(
        'error',
        'Error en Conexión con Resend',
        err.message || 'Verifica que la API Key sea correcta y que el dominio remitente esté verificado.'
      );
    } finally {
      setTestingResend(false);
    }
  };

  const copySqlToClipboard = () => {
    const sql = `-- Ejecutar en Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read" ON public.site_settings FOR SELECT
USING (
  key NOT IN ('resend_api_key')
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "site_settings_admin_manage" ON public.site_settings;
CREATE POLICY "site_settings_admin_manage" ON public.site_settings FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.site_settings (key, value, description)
VALUES 
  ('whatsapp_number', '5491100000000', 'WhatsApp oficial'),
  ('support_email', 'contacto@clickagro.com.ar', 'Email de soporte'),
  ('teacher_alert_email', 'profesores@clickagro.com.ar', 'Email de alertas docentes'),
  ('resend_from_email', 'Academia Click Agro <notificaciones@clickagro.com.ar>', 'Remitente oficial'),
  ('resend_api_key', '', 'API Key de Resend (re_...)'),
  ('is_maintenance_mode', 'false', 'Modo mantenimiento'),
  ('pending_payment_message', 'Si abonaste mediante Pago Fácil, Rapipago o Red Link, la acreditación puede demorar entre unas horas y 1 día hábil.', 'Mensaje pendiente'),
  ('maintenance_notice_message', 'Estamos realizando mejoras técnicas en nuestra plataforma. Volvemos en breve.', 'Aviso de mantenimiento')
ON CONFLICT (key) DO NOTHING;`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Toast Notification Flotante */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 flex items-start gap-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-700 text-white shadow-2xl max-w-md animate-in slide-in-from-top-3 fade-in duration-200">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <h4 className="text-xs font-bold text-white tracking-wide">{toast.title}</h4>
            <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast((prev) => ({ ...prev, show: false }))}
            className="text-zinc-500 hover:text-zinc-300 text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-agro-600 dark:text-agro-400 mb-1">
            <Sliders className="w-4 h-4" />
            <span>Módulo Administrativo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            Configuración Global del Sistema
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gestiona WhatsApp, correos de atención, credenciales de Resend y parámetros del negocio sin tocar código.
          </p>
        </div>

        {/* Acciones Rápidas del Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={checkSystemHealth}
            disabled={checkingSystem}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-sm disabled:opacity-50"
            title="Actualizar diagnóstico del sistema"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingSystem ? 'animate-spin text-agro-500' : ''}`} />
            <span className="hidden sm:inline">Diagnóstico</span>
          </button>

          <button
            onClick={() => handleSave()}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-agro-500 hover:bg-agro-600 active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-agro-500/25 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Selector de Pestañas (4 Tabs) */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('contact')}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'contact'
              ? 'border-agro-500 text-agro-600 dark:text-agro-400 bg-agro-50/50 dark:bg-agro-950/20 rounded-t-xl'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>1. Contacto & Soporte</span>
        </button>

        <button
          onClick={() => setActiveTab('resend')}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'resend'
              ? 'border-agro-500 text-agro-600 dark:text-agro-400 bg-agro-50/50 dark:bg-agro-950/20 rounded-t-xl'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>2. Integración Emails (Resend)</span>
        </button>

        <button
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'business'
              ? 'border-agro-500 text-agro-600 dark:text-agro-400 bg-agro-50/50 dark:bg-agro-950/20 rounded-t-xl'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>3. Negocio & Leyendas</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'system'
              ? 'border-agro-500 text-agro-600 dark:text-agro-400 bg-agro-50/50 dark:bg-agro-950/20 rounded-t-xl'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>4. Estado del Sistema</span>
          {systemStatus && (
            <span
              className={`w-2 h-2 rounded-full ${
                systemStatus.services.supabase.healthy ? 'bg-emerald-500' : 'bg-red-500 animate-ping'
              }`}
            />
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Loader2 className="w-8 h-8 text-agro-500 animate-spin mb-3" />
          <p className="text-xs font-medium">Recuperando parámetros de configuración...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">

          {/* ============================================================== */}
          {/* TAB 1: CONTACTO & SOPORTE                                      */}
          {/* ============================================================== */}
          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Formulario de Contacto */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. WhatsApp */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                        Número de WhatsApp Oficial
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Destino para el botón flotante en toda la academia y el checkout.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Número Telefónico (Formato Internacional sin signo +)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xs font-bold text-zinc-400">
                        +
                      </span>
                      <input
                        type="text"
                        value={whatsappNumber}
                        onChange={(e) => {
                          setWhatsappNumber(e.target.value);
                          if (validationErrors.whatsapp) {
                            setValidationErrors((prev) => ({ ...prev, whatsapp: undefined }));
                          }
                        }}
                        placeholder="5491100000000"
                        className={`w-full pl-8 pr-4 py-2.5 rounded-xl border ${
                          validationErrors.whatsapp
                            ? 'border-red-500 focus:ring-red-500/20'
                            : 'border-zinc-200 dark:border-zinc-700 focus:border-agro-500 focus:ring-agro-500/20'
                        } bg-zinc-50/50 dark:bg-zinc-800/50 text-xs sm:text-sm text-zinc-900 dark:text-white transition-all outline-none focus:ring-4`}
                      />
                    </div>
                    {validationErrors.whatsapp ? (
                      <p className="text-[11px] text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{validationErrors.whatsapp}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                        Ejemplo para Argentina: <strong>549</strong> (código país + móvil) seguido del código de área y número.
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Email de Atención al Cliente */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                        Email de Atención al Cliente y Soporte
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Mostrado en el Footer, páginas de pago y correos de bienvenida.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Dirección de Correo Oficial
                    </label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => {
                        setSupportEmail(e.target.value);
                        if (validationErrors.supportEmail) {
                          setValidationErrors((prev) => ({ ...prev, supportEmail: undefined }));
                        }
                      }}
                      placeholder="contacto@clickagro.com.ar"
                      className={`w-full px-4 py-2.5 rounded-xl border ${
                        validationErrors.supportEmail
                          ? 'border-red-500 focus:ring-red-500/20'
                          : 'border-zinc-200 dark:border-zinc-700 focus:border-agro-500 focus:ring-agro-500/20'
                        } bg-zinc-50/50 dark:bg-zinc-800/50 text-xs sm:text-sm text-zinc-900 dark:text-white transition-all outline-none focus:ring-4`}
                    />
                    {validationErrors.supportEmail && (
                      <p className="text-[11px] text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{validationErrors.supportEmail}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Email de Alertas Docentes */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                        Email de Alertas Docentes (Preguntas de Alumnos)
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Bandeja receptora de notificaciones cuando un estudiante formula una duda en un video.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Dirección de Destino de Alertas
                    </label>
                    <input
                      type="email"
                      value={teacherAlertEmail}
                      onChange={(e) => {
                        setTeacherAlertEmail(e.target.value);
                        if (validationErrors.teacherAlertEmail) {
                          setValidationErrors((prev) => ({ ...prev, teacherAlertEmail: undefined }));
                        }
                      }}
                      placeholder="profesores@clickagro.com.ar"
                      className={`w-full px-4 py-2.5 rounded-xl border ${
                        validationErrors.teacherAlertEmail
                          ? 'border-red-500 focus:ring-red-500/20'
                          : 'border-zinc-200 dark:border-zinc-700 focus:border-agro-500 focus:ring-agro-500/20'
                      } bg-zinc-50/50 dark:bg-zinc-800/50 text-xs sm:text-sm text-zinc-900 dark:text-white transition-all outline-none focus:ring-4`}
                    />
                    {validationErrors.teacherAlertEmail && (
                      <p className="text-[11px] text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{validationErrors.teacherAlertEmail}</span>
                      </p>
                    )}
                  </div>
                </div>

              </div>

              {/* Preview Interactivo del Botón WhatsApp y Tarjeta Resumen */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Visualizador de WhatsApp */}
                <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      Vista Previa en Tiempo Real
                    </span>
                    <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full">
                      Widget WhatsApp
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Así interactúan los productores y alumnos con el botón flotante en la esquina inferior derecha:
                  </p>

                  {/* Simulador de pantalla de usuario */}
                  <div className="relative h-48 bg-zinc-800/40 rounded-2xl border border-zinc-700/60 p-4 flex flex-col justify-end items-end overflow-hidden">
                    <div className="absolute top-3 left-3 text-[10px] text-zinc-400">
                      Simulación: clickagro.com.ar
                    </div>

                    {/* Tooltip Simulado */}
                    <div className="mb-3 px-3 py-1.5 bg-zinc-900 text-[11px] text-zinc-200 font-medium rounded-xl border border-zinc-700 shadow-md">
                      ¿Tienes dudas sobre los cursos? Chatea con un asesor
                    </div>

                    {/* Botón Flotante Simulado */}
                    <a
                      href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Hola Academia Click Agro! Consulta sobre cursos.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                      title="Probar enlace de WhatsApp"
                    >
                      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                    </a>
                  </div>

                  <div className="pt-2 text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>Enlace generado:</span>
                    <a
                      href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 font-mono inline-flex items-center gap-1 underline"
                    >
                      <span>wa.me/{whatsappNumber.replace(/\D/g, '')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Resumen Operativo */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                    Sincronización en Vivo
                  </h4>
                  <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCheck className="w-3.5 h-3.5 text-agro-500 shrink-0 mt-0.5" />
                      <span>El número actualizado se refleja al instante en el componente flotante.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCheck className="w-3.5 h-3.5 text-agro-500 shrink-0 mt-0.5" />
                      <span>El correo de soporte se sincroniza en el pie de página de toda la academia.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCheck className="w-3.5 h-3.5 text-agro-500 shrink-0 mt-0.5" />
                      <span>Las consultas de lecciones despachan correos al docente configurado.</span>
                    </li>
                  </ul>
                </div>

              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: INTEGRACIÓN DE EMAILS (RESEND)                           */}
          {/* ============================================================== */}
          {activeTab === 'resend' && (
            <div className="space-y-6">
              
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
                    <Mail className="w-4 h-4" />
                    <span>Pasarela de Correos Transaccionales</span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Credenciales de la API de Resend
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                    Gestiona la clave de Resend y el remitente de forma dinámica. Si configuras la API Key aquí, tendrá prioridad sobre la variable del archivo <code className="text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono">.env.local</code>.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  
                  {/* Campo: RESEND_API_KEY */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Resend API Key (`re_...`)
                    </label>
                    <div className="relative">
                      <input
                        type={showResendKey ? 'text' : 'password'}
                        value={resendApiKey}
                        onChange={(e) => {
                          setResendApiKey(e.target.value);
                          if (validationErrors.resendApiKey) {
                            setValidationErrors((prev) => ({ ...prev, resendApiKey: undefined }));
                          }
                        }}
                        placeholder="re_12345678_abcdef..."
                        className={`w-full pr-10 pl-4 py-2.5 rounded-xl border ${
                          validationErrors.resendApiKey
                            ? 'border-red-500 focus:ring-red-500/20'
                            : 'border-zinc-200 dark:border-zinc-700 focus:border-agro-500 focus:ring-agro-500/20'
                        } bg-zinc-50/50 dark:bg-zinc-800/50 text-xs sm:text-sm font-mono text-zinc-900 dark:text-white outline-none focus:ring-4 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowResendKey(!showResendKey)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-200"
                        title={showResendKey ? 'Ocultar API Key' : 'Mostrar API Key'}
                      >
                        {showResendKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {validationErrors.resendApiKey ? (
                      <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{validationErrors.resendApiKey}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-zinc-400">
                        Si dejas este campo vacío, la plataforma utilizará automáticamente el valor de <code className="font-mono text-[10px]">process.env.RESEND_API_KEY</code>.
                      </p>
                    )}
                  </div>

                  {/* Campo: resend_from_email */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Email de Remitente Oficial (`from`)
                    </label>
                    <input
                      type="text"
                      value={resendFromEmail}
                      onChange={(e) => setResendFromEmail(e.target.value)}
                      placeholder="Academia Click Agro <notificaciones@clickagro.com.ar>"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-agro-500 focus:ring-agro-500/20 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs sm:text-sm text-zinc-900 dark:text-white outline-none focus:ring-4 transition-all"
                    />
                    <p className="text-[11px] text-zinc-400">
                      Asegúrate de que el dominio esté verificado en tu cuenta de <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline">Resend Dashboard</a>.
                    </p>
                  </div>

                </div>

                {/* Acciones y Prueba de Conexión */}
                <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-purple-500" />
                      <span>Validación de Entrega en Tiempo Real</span>
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Envía un correo de prueba a <strong>{currentUser?.email || 'admin@clickagro.com.ar'}</strong> para comprobar que las credenciales respondan correctamente.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestResend}
                    disabled={testingResend}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 shrink-0"
                  >
                    {testingResend ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando correo de prueba...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Probar conexión con Resend</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: NEGOCIO & LEYENDAS                                      */}
          {/* ============================================================== */}
          {activeTab === 'business' && (
            <div className="space-y-8">
              
              {/* Interruptor Modo Mantenimiento */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          isMaintenanceMode
                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isMaintenanceMode ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                        {isMaintenanceMode ? 'Sitio en Modo Mantenimiento' : 'Plataforma 100% Operativa'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white pt-2">
                      Control de Estado Global de la Plataforma
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
                      Al activar el modo de mantenimiento, los visitantes y nuevos alumnos verán un aviso informativo mientras se llevan a cabo tareas técnicas o actualizaciones de cursos.
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isMaintenanceMode}
                      onChange={(e) => setIsMaintenanceMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Mensaje de Mantenimiento Configurable */}
                <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Aviso Personalizado de Mantenimiento
                  </label>
                  <textarea
                    rows={3}
                    value={maintenanceNoticeMessage}
                    onChange={(e) => setMaintenanceNoticeMessage(e.target.value)}
                    placeholder="Escribe el mensaje de mantenimiento para los usuarios..."
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs sm:text-sm text-zinc-900 dark:text-white focus:border-agro-500 focus:ring-4 focus:ring-agro-500/20 outline-none transition-all resize-none"
                  />
                  <p className="text-[11px] text-zinc-400">
                    Este mensaje se desplegará en la cabecera superior y pantallas de inicio de sesión durante intervenciones programadas.
                  </p>
                </div>
              </div>

              {/* Mensaje de Pago Pendiente */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Checkout Mercado Pago</span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Mensaje para Pagos en Efectivo / Pendientes (<code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">/checkout/pending</code>)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Instrucción oficial que visualiza el estudiante al abonar en Rapipago, Pago Fácil o transferencias en acreditación.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Editor */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Texto Explicativo del Proceso
                    </label>
                    <textarea
                      rows={5}
                      value={pendingPaymentMessage}
                      onChange={(e) => setPendingPaymentMessage(e.target.value)}
                      placeholder="Instrucciones para el alumno con pago pendiente..."
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs sm:text-sm text-zinc-900 dark:text-white focus:border-agro-500 focus:ring-4 focus:ring-agro-500/20 outline-none transition-all resize-none leading-relaxed"
                    />
                    <p className="text-[11px] text-zinc-400">
                      Recomendación: Explica que la habilitación es 100% automática tan pronto como la red confirme el pago.
                    </p>
                  </div>

                  {/* Preview de la tarjeta de Pending */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-center space-y-4 shadow-xl flex flex-col justify-center items-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                      <Clock className="w-7 h-7" />
                    </div>
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Pago en Proceso de Acreditación
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      Estamos aguardando la confirmación
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
                      {pendingPaymentMessage || 'Texto de ejemplo en tiempo real...'}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: ESTADO DEL SISTEMA                                      */}
          {/* ============================================================== */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              
              {/* Banner Informativo si la tabla de base de datos requiere migración */}
              {systemStatus && !systemStatus.services.supabase.tableSiteSettingsExists && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-3xl p-6 text-zinc-900 dark:text-amber-200 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                        Tabla <code>site_settings</code> Pendiente en Supabase
                      </h3>
                      <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed">
                        El sistema está funcionando con valores de contingencia seguros en memoria. Para persistir los cambios en PostgreSQL y aplicar las políticas RLS requeridas, ejecuta la migración en tu panel de Supabase:
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={copySqlToClipboard}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>¡SQL Copiado al Portapapeles!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar SQL de Migración</span>
                        </>
                      )}
                    </button>

                    <a
                      href="https://supabase.com/dashboard/project/kigeuajghtzzzyfkljrs/sql"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-400 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-semibold transition-all"
                    >
                      <span>Abrir Supabase SQL Editor</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Grid de Servicios y Variables */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. Supabase */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                            Supabase Database
                          </h4>
                          <span className="text-[10px] text-zinc-400">PostgreSQL + Auth</span>
                        </div>
                      </div>
                      <span
                        className={`w-3 h-3 rounded-full ${
                          systemStatus?.services.supabase.healthy
                            ? 'bg-emerald-500 shadow-sm shadow-emerald-500'
                            : 'bg-red-500 animate-ping'
                        }`}
                        title={systemStatus?.services.supabase.healthy ? 'Conectado' : 'Desconectado'}
                      />
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span className="text-zinc-500 dark:text-zinc-400">Conectividad DB:</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {systemStatus?.services.supabase.healthy ? (
                            <span className="text-emerald-500 font-semibold">Online ({systemStatus.services.supabase.latencyMs} ms)</span>
                          ) : (
                            <span className="text-red-500 font-semibold">Error</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span className="text-zinc-500 dark:text-zinc-400">Anon Key Pública:</span>
                        <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                          {systemStatus?.services.supabase.hasAnonKey ? '✓ Presente' : '✗ Faltante'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span className="text-zinc-500 dark:text-zinc-400">Service Role Key:</span>
                        <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                          {systemStatus?.services.supabase.hasServiceRole ? '✓ Configurado' : '✗ Faltante'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-zinc-500 dark:text-zinc-400">Tabla site_settings:</span>
                        <span
                          className={`font-semibold text-[11px] ${
                            systemStatus?.services.supabase.tableSiteSettingsExists
                              ? 'text-emerald-500'
                              : 'text-amber-500'
                          }`}
                        >
                          {systemStatus?.services.supabase.tableSiteSettingsExists
                            ? '✓ Sincronizada'
                            : 'Pendiente Migración'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 truncate">
                    URL: {systemStatus?.services.supabase.urlPreview || 'Consultando...'}
                  </div>
                </div>

                {/* 2. Mercado Pago */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                            Mercado Pago API
                          </h4>
                          <span className="text-[10px] text-zinc-400">Checkout Pro & Webhooks</span>
                        </div>
                      </div>
                      <span
                        className={`w-3 h-3 rounded-full ${
                          systemStatus?.services.mercadopago.configured
                            ? 'bg-emerald-500 shadow-sm shadow-emerald-500'
                            : 'bg-amber-500'
                        }`}
                      />
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span className="text-zinc-500 dark:text-zinc-400">Estado de Pasarela:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {systemStatus?.services.mercadopago.status || 'Verificando...'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span className="text-zinc-500 dark:text-zinc-400">Ambiente Detectado:</span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">
                          {systemStatus?.services.mercadopago.isLive
                            ? 'Producción Oficial'
                            : systemStatus?.services.mercadopago.isSandbox
                            ? 'Modo Pruebas (Sandbox)'
                            : 'Simulación Local'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-zinc-500 dark:text-zinc-400">Access Token:</span>
                        <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                          {systemStatus?.services.mercadopago.tokenPreview || 'Sin clave'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400">
                    Soporta ARS (Pesos Argentinos) e Idempotencia
                  </div>
                </div>

                {/* 3. Resend */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                            Resend Emails
                          </h4>
                          <span className="text-[10px] text-zinc-400">Correos Transaccionales</span>
                        </div>
                      </div>
                      <span
                        className={`w-3 h-3 rounded-full ${
                          systemStatus?.services.resend.configured
                            ? 'bg-emerald-500 shadow-sm shadow-emerald-500'
                            : 'bg-amber-500'
                        }`}
                      />
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span className="text-zinc-500 dark:text-zinc-400">Estado de Envío:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {systemStatus?.services.resend.status || 'Verificando...'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span className="text-zinc-500 dark:text-zinc-400">Remitente Configurado:</span>
                        <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">
                          {resendFromEmail || systemStatus?.services.resend.fromEmail}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-zinc-500 dark:text-zinc-400">Destino Alertas Docentes:</span>
                        <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">
                          {teacherAlertEmail || systemStatus?.services.resend.alertEmail}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400">
                    Notificaciones de matriculación y consultas
                  </div>
                </div>

              </div>

              {/* Panel de Información del Servidor */}
              {systemStatus && (
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-3">
                    <Server className="w-4 h-4 text-agro-500 shrink-0" />
                    <span>
                      Entorno de Ejecución: <strong className="text-zinc-800 dark:text-zinc-200 uppercase">{systemStatus.services.environment.nodeEnv}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      URL Pública: <strong className="text-zinc-800 dark:text-zinc-200">{systemStatus.services.environment.appUrl}</strong>
                    </span>
                  </div>
                  <div className="text-[11px]">
                    Última comprobación: {new Date(systemStatus.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Botón flotante inferior para guardar en pantallas largas */}
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-agro-500 hover:bg-agro-600 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-agro-500/25 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando Cambios...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Toda la Configuración</span>
                </>
              )}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}

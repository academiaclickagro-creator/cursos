'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SiteSettingsMap {
  whatsapp_number: string;
  support_email: string;
  teacher_alert_email: string;
  resend_from_email: string;
  is_maintenance_mode: string;
  pending_payment_message: string;
  maintenance_notice_message: string;
  [key: string]: string;
}

const DEFAULT_SETTINGS: SiteSettingsMap = {
  whatsapp_number: '5491100000000',
  support_email: 'contacto@clickagro.com.ar',
  teacher_alert_email: 'profesores@clickagro.com.ar',
  resend_from_email: 'Academia Click Agro <notificaciones@clickagro.com.ar>',
  is_maintenance_mode: 'false',
  pending_payment_message:
    'Si abonaste mediante Pago Fácil, Rapipago o Red Link, la acreditación puede demorar entre unas horas y 1 día hábil. Tan pronto como Mercado Pago nos notifique, se habilitará tu acceso de manera 100% automática.',
  maintenance_notice_message:
    'Estamos realizando mejoras técnicas en nuestra plataforma para brindarte una mejor experiencia de aprendizaje. Volvemos en breve.',
};

// Cache en memoria para evitar re-fetches innecesarios entre componentes del frontend
let cachedSettings: SiteSettingsMap | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30000; // 30 segundos

/**
 * Hook para consumir la configuración global de Academia Click Agro.
 * Funciona de manera autónoma con fallback inmediato en caso de latencia o desconexión.
 */
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettingsMap>(cachedSettings || DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(!cachedSettings);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedSettings && now - lastFetchTime < CACHE_TTL_MS) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }
      const data = await res.json();
      if (data && data.settings) {
        const merged: SiteSettingsMap = {
          ...DEFAULT_SETTINGS,
          ...data.settings,
        };
        cachedSettings = merged;
        lastFetchTime = Date.now();
        setSettings(merged);
        setError(null);
      }
    } catch (err: any) {
      console.warn('Advertencia en useSiteSettings, usando valores predeterminados:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const getSetting = (key: string, fallback?: string): string => {
    return settings[key] || fallback || DEFAULT_SETTINGS[key] || '';
  };

  return {
    settings,
    loading,
    error,
    reloadSettings: () => fetchSettings(true),
    getSetting,
    whatsappNumber: settings.whatsapp_number || DEFAULT_SETTINGS.whatsapp_number,
    supportEmail: settings.support_email || DEFAULT_SETTINGS.support_email,
    teacherAlertEmail: settings.teacher_alert_email || DEFAULT_SETTINGS.teacher_alert_email,
    resendFromEmail: settings.resend_from_email || DEFAULT_SETTINGS.resend_from_email,
    isMaintenanceMode: settings.is_maintenance_mode === 'true',
    pendingPaymentMessage: settings.pending_payment_message || DEFAULT_SETTINGS.pending_payment_message,
    maintenanceNoticeMessage: settings.maintenance_notice_message || DEFAULT_SETTINGS.maintenance_notice_message,
  };
}

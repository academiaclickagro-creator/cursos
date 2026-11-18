'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  User, 
  Lock, 
  CreditCard, 
  Award, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  KeyRound,
  ShieldCheck,
  Calendar,
  DollarSign
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function StudentProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'purchases'>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const { data: authData } = await supabaseBrowser.auth.getUser();
        const user = authData?.user;

        if (!user) {
          window.location.href = '/login?redirect=/dashboard/perfil';
          return;
        }

        // 1. Cargar perfil
        const { data: profileData } = await supabaseBrowser
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const resolvedName = profileData?.full_name ||
          [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ') ||
          user.user_metadata?.full_name ||
          '';

        const currentProfile = profileData ? {
          ...profileData,
          full_name: resolvedName,
        } : {
          id: user.id,
          email: user.email,
          full_name: resolvedName,
          role: 'student',
        };

        setProfile(currentProfile);
        setFullName(resolvedName);
        setAvatarUrl(currentProfile.avatar_url || '');

        // 2. Cargar compras
        const { data: enrollmentsData } = await supabaseBrowser
          .from('enrollments')
          .select('*, courses(title), combos(title)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        setEnrollments(enrollmentsData || []);

        // 3. Cargar certificados
        const { data: certsData } = await supabaseBrowser
          .from('certificates')
          .select('*, courses(title)')
          .eq('user_id', user.id)
          .order('issued_at', { ascending: false });

        setCertificates(certsData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  // Guardar Datos Personales
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const { error } = await supabaseBrowser
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          avatar_url: avatarUrl.trim() || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      // Actualizar metadata de auth
      await supabaseBrowser.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      setSuccessMsg('Datos personales actualizados correctamente.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al actualizar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cambiar Contraseña
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const { error } = await supabaseBrowser.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccessMsg('¡Tu contraseña ha sido actualizada con éxito!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al actualizar la contraseña.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-4">
        <Loader2 className="w-10 h-10 text-agro-500 animate-spin mb-4" />
        <p className="text-xs text-zinc-400 font-medium">Cargando tu perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-8 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-agro-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Mis Cursos</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-agro-500" />
            <span>Campus Click Agro</span>
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
        
        {/* Ficha Superior del Alumno */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-agro-100 dark:bg-agro-900/50 text-agro-600 dark:text-agro-400 border border-agro-400/30 flex items-center justify-center font-black text-2xl shrink-0">
              {fullName?.charAt(0) || <User className="w-8 h-8" />}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white">
                {fullName || 'Estudiante'}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{profile.email}</p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-agro-50 dark:bg-agro-950 text-agro-700 dark:text-agro-300 border border-agro-300 dark:border-agro-800 mt-2">
                <ShieldCheck className="w-3 h-3 text-agro-500" />
                <span>Alumno Verificado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <button
            onClick={() => {
              setActiveTab('profile');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-agro-500 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Datos Personales
          </button>
          <button
            onClick={() => {
              setActiveTab('security');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'security'
                ? 'bg-agro-500 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Seguridad y Contraseña
          </button>
          <button
            onClick={() => {
              setActiveTab('purchases');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'purchases'
                ? 'bg-agro-500 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Historial de Compras y Certificados
          </button>
        </div>

        {/* Mensajes de Estado */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: DATOS PERSONALES */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Información de tu Perfil
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                El nombre que definas aquí es el que se imprimirá formalmente en tus diplomas y certificados de aprobación.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">
                  Nombre Completo (como aparecerá en el Certificado) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Ing. Juan Manuel Pérez"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-agro-500"
                />
              </div>

              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">
                  Correo Electrónico (Registrado con tu compra)
                </label>
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 text-sm cursor-not-allowed"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Para modificar tu correo de acceso contacta a soporte@clickagro.com.ar.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: SEGURIDAD Y CAMBIO DE CONTRASEÑA */}
        {activeTab === 'security' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Actualizar Contraseña de Acceso
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Si ingresaste con la contraseña provisoria enviada tras tu pago, define una nueva clave personal y segura.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs max-w-md">
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">
                  Nueva Contraseña *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-agro-500"
                />
              </div>

              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold block mb-1.5">
                  Confirmar Nueva Contraseña *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-agro-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  <span>Actualizar Contraseña</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: HISTORIAL DE COMPRAS Y CERTIFICADOS */}
        {activeTab === 'purchases' && (
          <div className="space-y-6">
            
            {/* Comprobantes de Pago Mercado Pago */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-agro-500" />
                <span>Órdenes de Compra (Mercado Pago)</span>
              </h3>

              {enrollments.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">
                  No registras pagos procesados aún.
                </p>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {enrollments.map((enr) => (
                    <div key={enr.id} className="py-3.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">
                          {enr.courses?.title || (enr.combos ? `Combo: ${enr.combos.title}` : 'Curso')}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          ID Transacción: <span className="font-mono">{enr.payment_id || 'N/A'}</span> • {new Date(enr.created_at).toLocaleDateString('es-AR')}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-zinc-900 dark:text-white block">
                          ${Number(enr.amount_paid).toLocaleString('es-AR')} ARS
                        </span>
                        <span className="text-[10px] font-bold text-agro-600 dark:text-agro-400 uppercase">
                          {enr.payment_status === 'approved' ? 'Aprobado ✓' : enr.payment_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Diplomas Obtenidos */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Mis Certificados Acreditados</span>
              </h3>

              {certificates.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">
                  Completa el 100% de las lecciones de tus cursos para obtener tu certificado oficial.
                </p>
              ) : (
                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">
                          {cert.courses?.title || 'Certificado Oficial'}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          Emitido el {new Date(cert.issued_at).toLocaleDateString('es-AR')}
                        </p>
                      </div>

                      <Link
                        href={cert.pdf_url || `/validar/${cert.id}`}
                        target="_blank"
                        className="px-4 py-2 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-xs shadow-xs"
                      >
                        Verificar Constancia
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

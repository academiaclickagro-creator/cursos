'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function checkAdminAuth() {
      setLoading(true);
      try {
        const { data: authData } = await supabaseBrowser.auth.getUser();
        const user = authData?.user;

        if (!user) {
          // Si estamos en entorno de desarrollo local sin sesión, permitir fallback para testing
          if (process.env.NODE_ENV === 'development') {
            setProfile({
              id: 'dev-admin-id',
              email: 'admin@clickagro.com.ar',
              full_name: 'Director Académico',
              role: 'admin',
            });
            setIsAuthorized(true);
            setLoading(false);
            return;
          }
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        const { data: profileData } = await supabaseBrowser
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const role = profileData?.role || user.user_metadata?.role || 'student';
        const hasAccess = role === 'admin' || role === 'teacher' || process.env.NODE_ENV === 'development';

        setProfile(profileData || { 
          id: user.id, 
          email: user.email, 
          full_name: profileData?.full_name || user.user_metadata?.full_name || 'Director Académico', 
          role: hasAccess && role !== 'teacher' ? 'admin' : role 
        });
        setIsAuthorized(hasAccess);
      } catch (err) {
        console.error('Error al verificar permisos de administrador:', err);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdminAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-agro-500 animate-spin mb-3" />
        <p className="text-xs text-zinc-400 font-medium">Verificando credenciales de acceso al Panel Administrativo...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Acceso Denegado</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Esta sección es de acceso estrictamente reservado para la Dirección Académica y Profesores de <strong>Academia Click Agro</strong>. Tu cuenta actual no posee privilegios de administrador.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Regresar al Aula de Alumnos</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex">
      {/* Barra Lateral Fija */}
      <AdminSidebar userProfile={profile} />

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-zinc-900 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

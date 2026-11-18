'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, GraduationCap, LayoutDashboard, User } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('student');

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabaseBrowser.auth.getUser();
      if (data?.user) {
        setCurrentUser(data.user);
        const { data: profile } = await supabaseBrowser
          .from('profiles')
          .select('role, full_name')
          .eq('id', data.user.id)
          .maybeSingle();
        const isMaster = data.user.email?.toLowerCase() === 'academiaclickagro@gmail.com';
        if (isMaster) {
          setUserRole('admin');
        } else if (profile) {
          setUserRole(profile.role);
        }
      }
    }
    checkAuth();
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Oficial de Academia Click Agro */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-white shadow-xs border border-zinc-100 dark:border-zinc-800 group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="Academia Click Agro Logo"
                fill
                sizes="44px"
                className="object-contain p-1"
                priority
              />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-zinc-950 dark:text-white leading-none block">
                ACADEMIA <span className="text-agro-500">CLICK AGRO</span>
              </span>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase block mt-0.5">
                Capacitación en Tecnología Agropecuaria
              </span>
            </div>
          </Link>

          {/* Menú de Navegación (Escritorio) */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#catalogo"
              className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-agro-600 dark:hover:text-agro-400 transition-colors"
            >
              Cursos y Combos
            </Link>
            <Link
              href="#metodologia"
              className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-agro-600 dark:hover:text-agro-400 transition-colors"
            >
              Metodología
            </Link>
            <Link
              href="#faq"
              className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-agro-600 dark:hover:text-agro-400 transition-colors"
            >
              Preguntas Frecuentes
            </Link>
            <Link
              href="/validar"
              className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-agro-600 dark:hover:text-agro-400 transition-colors"
            >
              Validar Certificado
            </Link>
          </nav>

          {/* Acciones de Usuario (Escritorio) */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                {userRole === 'admin' || userRole === 'teacher' ? (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-zinc-800 hover:bg-zinc-800 border border-zinc-700 transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-agro-400" />
                    <span>Panel Docente</span>
                  </Link>
                ) : null}

                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-agro-500 hover:bg-agro-600 text-white shadow-md hover:shadow-agro-500/25 transition-all"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Mi Aula Virtual</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:text-agro-600 transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="#catalogo"
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-agro-500 hover:bg-agro-600 text-white shadow-md hover:shadow-agro-500/25 hover:scale-[1.02] transition-all"
                >
                  Ver Catálogo
                </Link>
              </div>
            )}
          </div>

          {/* Botón Menú Móvil */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
            aria-label="Abrir menú"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menú Desplegable en Móviles */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-6 py-6 space-y-4 animate-in slide-in-from-top-2 duration-150">
          <Link
            href="#catalogo"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-bold text-zinc-800 dark:text-zinc-200 py-1"
          >
            Cursos y Combos
          </Link>
          <Link
            href="#metodologia"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-bold text-zinc-800 dark:text-zinc-200 py-1"
          >
            Metodología
          </Link>
          <Link
            href="#faq"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-bold text-zinc-800 dark:text-zinc-200 py-1"
          >
            Preguntas Frecuentes
          </Link>
          <Link
            href="/validar"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-bold text-zinc-800 dark:text-zinc-200 py-1 text-agro-600 dark:text-agro-400"
          >
            Validar Certificado Oficial
          </Link>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
            {currentUser ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center py-3 rounded-xl bg-agro-500 text-white font-bold text-sm"
                >
                  Ir a Mi Aula Virtual
                </Link>
                {(userRole === 'admin' || userRole === 'teacher') && (
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl bg-zinc-900 text-white font-bold text-xs"
                  >
                    Panel de Administración
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-sm"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="#catalogo"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center py-3 rounded-xl bg-agro-500 text-white font-bold text-sm shadow-md"
                >
                  Inscribirme a un Curso
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

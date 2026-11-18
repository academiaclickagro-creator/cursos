'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Ticket, 
  MessageSquareCheck, 
  ArrowLeft, 
  ShieldAlert, 
  LogOut,
  Layers,
  GraduationCap,
  Sliders
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

interface AdminSidebarProps {
  userProfile?: {
    email: string;
    full_name?: string;
    role: string;
  };
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ userProfile }) => {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Métricas y Ventas',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: 'Cursos y Combos',
      href: '/admin/cursos',
      icon: BookOpen,
    },
    {
      name: 'Cupones de Descuento',
      href: '/admin/cupones',
      icon: Ticket,
    },
    {
      name: 'Preguntas y Moderación',
      href: '/admin/preguntas',
      icon: MessageSquareCheck,
    },
    {
      name: 'Configuración Global',
      href: '/admin/configuracion',
      icon: Sliders,
    },
  ];

  const handleSignOut = async () => {
    await supabaseBrowser.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 bg-zinc-950 text-white flex flex-col border-r border-zinc-800 shrink-0 min-h-screen">
      {/* 1. Header con Logo */}
      <div className="p-5 border-b border-zinc-800/80">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-white/5 p-1 border border-zinc-800">
            <Image
              src="/logo.png"
              alt="Academia Click Agro"
              fill
              sizes="36px"
              className="object-contain"
              priority
            />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-white block">
              CLICK <span className="text-agro-400">AGRO</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded">
              Panel Administrativo
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Badge de Usuario Autenticado */}
      {userProfile && (
        <div className="px-5 py-4 bg-zinc-900/60 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-agro-500/20 text-agro-400 border border-agro-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              {userProfile.full_name?.charAt(0) || <GraduationCap className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-200 truncate">
                {userProfile.full_name || userProfile.email}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-agro-400 animate-pulse" />
                <span className="text-[10px] text-zinc-400 font-semibold uppercase">
                  {userProfile.role === 'admin' ? 'Administrador' : 'Profesor'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Navegación Principal */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact 
            ? pathname === item.href 
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-agro-500 text-white shadow-sm shadow-agro-500/30'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* 4. Footer y Salida */}
      <div className="p-3 border-t border-zinc-800/80 space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Vista de Alumno</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

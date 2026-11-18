'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  LogIn, 
  Mail, 
  Lock, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Manejo de Inicio de Sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales incorrectas. Verifica tu email y contraseña.');
        }
        throw error;
      }

      if (data?.user) {
        // Verificar si es admin/profesor para redirigir a /admin si no venía de otra ruta específica
        if (redirectUrl === '/dashboard') {
          const { data: profile } = await supabaseBrowser
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle();

          const isMasterAdmin = data.user.email?.toLowerCase() === 'academiaclickagro@gmail.com';
          if (profile?.role === 'admin' || profile?.role === 'teacher' || isMasterAdmin) {
            router.push('/admin');
            return;
          }
        }

        router.push(redirectUrl);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejo de Recuperación de Contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Ingresa un correo electrónico válido');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const appUrl = window.location.origin;
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${appUrl}/dashboard`,
      });

      if (error) throw error;

      setSuccessMessage('Te hemos enviado un correo con instrucciones para restablecer tu contraseña.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al solicitar recuperación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Luz ambiental sutil de fondo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-agro-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Tarjeta de Inicio de Sesión */}
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-7 sm:p-9 shadow-2xl relative z-10 space-y-6">
        
        {/* Cabecera con Logo */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-white mx-auto shadow-md p-1 border border-zinc-700">
              <Image src="/logo.png" alt="Academia Click Agro" fill className="object-contain p-1" priority />
            </div>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white pt-2">
            {mode === 'login' ? 'Acceso a Alumnos y Docentes' : 'Recuperar Contraseña'}
          </h1>
          <p className="text-xs text-zinc-400">
            {mode === 'login'
              ? 'Ingresa tus credenciales para acceder a tu Aula Virtual'
              : 'Te enviaremos un enlace de acceso seguro a tu casilla de correo'}
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Mensaje de Éxito */}
        {successMessage && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulario de Login */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="text-zinc-300 font-semibold block mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@clickagro.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-700 bg-zinc-950 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-agro-500 text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="text-zinc-300 font-semibold">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setErrorMessage(null);
                  }}
                  className="text-agro-400 hover:underline text-[11px]"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-700 bg-zinc-950 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-agro-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-sm shadow-lg shadow-agro-500/25 transition-all disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Formulario de Recuperación */
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
            <div>
              <label className="text-zinc-300 font-semibold block mb-1.5">
                Ingresa tu correo registrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@clickagro.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-700 bg-zinc-950 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-agro-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>Enviar Enlace de Recuperación</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="w-full text-center text-xs text-zinc-400 hover:text-white pt-2 block"
            >
              ← Regresar al Inicio de Sesión
            </button>
          </form>
        )}

        {/* Footer de la tarjeta */}
        <div className="pt-4 border-t border-zinc-800 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a la Página Principal</span>
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-4">
          <Loader2 className="w-10 h-10 text-agro-500 animate-spin mb-4" />
          <p className="text-xs text-zinc-400 font-medium">Iniciando sesión segura...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

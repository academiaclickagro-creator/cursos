'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, GraduationCap, ArrowRight, Mail, ShieldCheck, PlayCircle, Sparkles } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  const title = searchParams.get('title');
  const buyerName = searchParams.get('buyer_name');
  const isSimulated = searchParams.get('simulated') === 'true';

  const classroomUrl = slug ? `/dashboard/cursos/${slug}` : '/dashboard';

  return (
    <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
      
      {/* Ícono de Confirmación */}
      <div className="w-20 h-20 rounded-3xl bg-agro-500/10 border border-agro-500/30 text-agro-400 flex items-center justify-center mx-auto shadow-inner">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-agro-500/20 text-agro-300 border border-agro-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-agro-400" />
            {isSimulated ? 'Pago Simulado Acreditado' : 'Transacción Aprobada'}
          </span>
          {isSimulated && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Modo Pruebas
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
          {buyerName ? `¡Bienvenido, ${buyerName}!` : '¡Bienvenido a Academia Click Agro!'}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
          {title ? (
            <>Tu inscripción a <strong>{title}</strong> se encuentra 100% activa con acceso inmediato.</>
          ) : (
            <>Tu pago ha sido acreditado exitosamente y tu matrícula ya se encuentra activa en nuestra plataforma.</>
          )}
        </p>
      </div>

      {/* Ficha Informativa */}
      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-left space-y-2.5 text-xs">
        <div className="flex items-start gap-2.5 text-zinc-300">
          <GraduationCap className="w-4 h-4 text-agro-400 shrink-0 mt-0.5" />
          <span>
            Tu usuario tiene acceso desbloqueado para ver todas las clases en video, planillas Excel y materiales PDF.
          </span>
        </div>
        <div className="flex items-start gap-2.5 text-zinc-300">
          <Mail className="w-4 h-4 text-agro-400 shrink-0 mt-0.5" />
          <span>
            Ya iniciaste sesión en tu cuenta para que puedas cursar de inmediato.
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className="space-y-3 pt-2">
        <Link
          href={classroomUrl}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-sm shadow-lg shadow-agro-500/25 hover:scale-[1.02] transition-all"
        >
          <PlayCircle className="w-4 h-4" />
          <span>{slug ? 'Comenzar a Cursar Ahora' : 'Ir a Mi Aula Virtual'}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        {slug && (
          <Link
            href="/dashboard"
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Ver todos mis cursos matriculados
          </Link>
        )}

        <Link
          href="/"
          className="w-full inline-flex items-center justify-center px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <Suspense fallback={<div className="text-xs text-zinc-400">Cargando confirmación...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { XCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function CheckoutFailurePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
          <XCircle className="w-10 h-10" />
        </div>

        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 mb-2">
            No se pudo procesar el pago
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            El pago fue rechazado
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
            Tu tarjeta o entidad bancaria no aprobó la transacción. No se ha realizado ningún cobro en tu cuenta.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/#catalogo"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-xs sm:text-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Intentar con otro medio de pago</span>
          </Link>

          <Link
            href="/"
            className="w-full inline-flex items-center justify-center px-4 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, ArrowLeft, MessageCircle } from 'lucide-react';
import { useSiteSettings } from '@/lib/useSiteSettings';

export default function CheckoutPendingPage() {
  const { pendingPaymentMessage, whatsappNumber } = useSiteSettings();

  const customMessage =
    pendingPaymentMessage ||
    'Si abonaste mediante Pago Fácil, Rapipago o Red Link, la acreditación puede demorar entre unas horas y 1 día hábil. Tan pronto como Mercado Pago nos notifique, se habilitará tu acceso de manera 100% automática.';

  const cleanPhone = (whatsappNumber || '5491100000000').replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    'Hola Academia Click Agro! Acabo de realizar un pago en efectivo y quisiera confirmar el estado de mi acreditación.'
  )}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
          <Clock className="w-10 h-10" />
        </div>

        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
            Pago en Proceso de Acreditación
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Estamos aguardando la confirmación
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
            {customMessage}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Consultar por WhatsApp</span>
          </a>

          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs sm:text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Regresar a la Página Principal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

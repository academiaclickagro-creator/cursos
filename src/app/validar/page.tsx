'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Search, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/public/Navbar';
import { Footer } from '@/components/public/Footer';

export default function ValidateSearchPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
    router.push(`/validar/${cleanCode}`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-14 lg:py-20 w-full flex flex-col items-center justify-center">
        
        {/* Cabecera Principal */}
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-agro-100 dark:bg-agro-950/60 border border-agro-300 dark:border-agro-800 text-agro-800 dark:text-agro-300 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-agro-600 dark:text-agro-400" />
            <span>Sistema Oficial de Acreditación y Validación</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-950 dark:text-white tracking-tight">
            Validador de Certificados Oficiales
          </h1>

          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Comprueba la autenticidad y vigencia de los certificados emitidos por <strong>Academia Click Agro</strong> a productores, ingenieros agrónomos y técnicos de toda la región.
          </p>
        </div>

        {/* Formulario de Búsqueda de Código */}
        <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-2">
                Ingresa el Código de Autenticidad (impreso en el diploma)
              </label>
              
              <div className="relative">
                <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ej: CA-4F9A-B231-9041"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 font-mono text-sm tracking-wider uppercase text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-agro-500"
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">
                El código de verificación se encuentra al pie de todos los diplomas emitidos en formato PDF.
              </p>
            </div>

            <button
              type="submit"
              disabled={!code.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-sm shadow-lg shadow-agro-500/25 transition-all disabled:opacity-50 hover:scale-[1.01]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verificar Certificado</span>
            </button>
          </form>

          {/* Información Institucional */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 space-y-2 text-xs text-zinc-500">
            <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-200">
              <Award className="w-4 h-4 text-agro-600" />
              <span>Garantía de Certificación Click Agro</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Cada diploma cuenta con un registro inmutable en nuestra base de datos que corrobora la identidad del estudiante, el programa completado y la fecha formal de aprobación.
            </p>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}

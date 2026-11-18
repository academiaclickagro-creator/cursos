'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  Calendar, 
  User, 
  BookOpen, 
  Printer, 
  Search, 
  AlertTriangle, 
  Loader2,
  ArrowLeft,
  Building
} from 'lucide-react';
import { Navbar } from '@/components/public/Navbar';
import { Footer } from '@/components/public/Footer';

interface VerifyPageProps {
  params: {
    codigo: string;
  };
}

export default function CertificateDetailPage({ params }: VerifyPageProps) {
  const { codigo } = params;
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyCertificate() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/certificates/verify/${codigo}`);
        const result = await response.json();

        if (!response.ok || !result.is_valid) {
          setError(result.message || 'El certificado no fue encontrado o no es válido.');
          setData(null);
        } else {
          setData(result);
        }
      } catch (err: any) {
        setError('Ocurrió un error al consultar el registro de autenticidad.');
      } finally {
        setIsLoading(false);
      }
    }

    if (codigo) {
      verifyCertificate();
    }
  }, [codigo]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 lg:py-16 w-full flex flex-col items-center justify-center">
        
        {/* PANTALLA DE CARGA */}
        {isLoading && (
          <div className="py-20 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-agro-500 animate-spin mx-auto" />
            <p className="text-sm text-zinc-500 font-medium">
              Verificando autenticidad en el registro oficial de Click Agro...
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASO: CERTIFICADO VÁLIDO Y AUTÉNTICO                                      */}
        {/* ========================================================================= */}
        {!isLoading && data && (
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border-2 border-agro-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-200">
            
            {/* Header del Certificado */}
            <div className="text-center space-y-3 pb-6 border-b border-zinc-100 dark:border-zinc-800">
              <div className="w-20 h-20 rounded-3xl bg-agro-100 dark:bg-agro-950/60 border border-agro-400/50 text-agro-600 dark:text-agro-400 flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-11 h-11" />
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-agro-50 dark:bg-agro-950/60 border border-agro-500 text-agro-700 dark:text-agro-300 text-xs font-black uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-agro-500 animate-pulse" />
                <span>Certificado Oficial Verificado</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white">
                Constancia Oficial de Autenticidad
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Documento respaldado por los registros académicos de <strong>Academia Click Agro</strong>.
              </p>
            </div>

            {/* Ficha de Detalles del Titular */}
            <div className="space-y-5 text-xs sm:text-sm">
              
              {/* Titular */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Estudiante Certificado
                </span>
                <p className="text-xl sm:text-2xl font-black text-agro-700 dark:text-agro-400">
                  {data.student_name}
                </p>
              </div>

              {/* Curso Aprobado */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Programa de Formación Aprobado
                </span>
                <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                  "{data.course_title}"
                </p>
                {data.course_description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {data.course_description}
                  </p>
                )}
              </div>

              {/* Fila de Metadatos: Código, Fecha y Emisor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Código de Autenticidad
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white text-xs sm:text-sm">
                    {data.certificate_code}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Fecha de Emisión
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {new Date(data.issued_at).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Entidad Emisora */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3">
                <Building className="w-5 h-5 text-agro-600 dark:text-agro-400 shrink-0" />
                <div className="text-xs">
                  <span className="text-zinc-400 block font-semibold text-[10px] uppercase">
                    Entidad Emisora
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {data.issuer}
                  </span>
                </div>
              </div>

            </div>

            {/* Botonera de Acciones */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm transition-all shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Guardar Constancia</span>
              </button>

              <Link
                href="/validar"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>Verificar Otro</span>
              </Link>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* CASO: CERTIFICADO INVÁLIDO O NO ENCONTRADO                                */}
        {/* ========================================================================= */}
        {!isLoading && error && (
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-900 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-400 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 mb-2">
                Registro No Encontrado
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white mt-1">
                Certificado No Válido
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                El código <strong className="font-mono text-zinc-800 dark:text-zinc-200">"{codigo}"</strong> no figura en los registros de acreditación formal de Academia Click Agro o fue tipeado con errores.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                href="/validar"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
              >
                <Search className="w-4 h-4" />
                <span>Intentar con otro código</span>
              </Link>

              <Link
                href="/"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Ir a la Página Principal
              </Link>
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}

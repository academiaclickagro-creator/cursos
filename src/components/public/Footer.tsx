'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, ShieldCheck, CreditCard } from 'lucide-react';
import { useSiteSettings } from '@/lib/useSiteSettings';

export const Footer: React.FC = () => {
  const { supportEmail, whatsappNumber } = useSiteSettings();
  const emailToDisplay = supportEmail || 'contacto@clickagro.com.ar';
  const cleanPhone = (whatsappNumber || '5491100000000').replace(/\D/g, '');

  return (
    <footer className="relative z-20 bg-zinc-950 text-white border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* 1. Identidad de Marca */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-white p-1">
                <Image
                  src="/logo.png"
                  alt="Academia Click Agro"
                  fill
                  sizes="40px"
                  className="object-contain p-1"
                />
              </div>
              <span className="text-lg font-black tracking-tight text-white">
                ACADEMIA <span className="text-agro-500">CLICK AGRO</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Plataforma líder en formación práctica para ingenieros agrónomos, productores y asesores técnicos. Transformamos datos agrícolas en decisiones de alto rendimiento.
            </p>
            <div className="flex items-center gap-2 text-xs text-agro-400 font-semibold pt-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Plataforma 100% Verificada y Segura</span>
            </div>
          </div>

          {/* 2. Programas y Áreas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Áreas de Formación
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <Link href="/#catalogo" className="hover:text-agro-400 transition-colors">
                  Agricultura de Precisión
                </Link>
              </li>
              <li>
                <Link href="/#catalogo" className="hover:text-agro-400 transition-colors">
                  Monitoreo Satelital (NDVI y Balance Hídrico)
                </Link>
              </li>
              <li>
                <Link href="/#catalogo" className="hover:text-agro-400 transition-colors">
                  Pulverización y Vuelos con Drones
                </Link>
              </li>
              <li>
                <Link href="/#catalogo" className="hover:text-agro-400 transition-colors">
                  Prescripciones Variables de Siembra
                </Link>
              </li>
              <li>
                <Link href="/#catalogo" className="hover:text-agro-400 transition-colors">
                  Gestión Económica de Lotes Agrícolas
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. Métodos de Pago y Seguridad */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Pasarela Oficial
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Procesamiento automático y seguro en pesos argentinos (ARS) mediante <strong>Mercado Pago</strong> con tarjetas de débito, crédito y transferencias bancarias.
            </p>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-agro-400 shrink-0" />
              <div className="text-[11px] text-zinc-300">
                <span className="font-bold text-white block">Checkout Oficial</span>
                Acceso inmediato y matriculación automática
              </div>
            </div>
          </div>

          {/* 4. Contacto y Soporte */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Contacto y Soporte
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400">
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-agro-400 shrink-0" />
                <a href={`mailto:${emailToDisplay}`} className="hover:text-white transition-colors">
                  {emailToDisplay}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-agro-400 shrink-0" />
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hola Academia Click Agro! Deseo consultar sobre los cursos.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-agro-400 transition-colors"
                >
                  WhatsApp: +{cleanPhone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-agro-400 shrink-0" />
                <span>Buenos Aires, Argentina</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Academia Click Agro. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <span className="hover:text-zinc-300 cursor-pointer">Términos del Servicio</span>
            <span className="hover:text-zinc-300 cursor-pointer">Política de Privacidad</span>
            <Link href="/validar" className="text-agro-400 hover:text-agro-300 font-semibold transition-colors">
              Validar Certificado Oficial
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Sprout, 
  Satellite, 
  Award, 
  CheckCircle2, 
  Clock, 
  Video, 
  FileSpreadsheet, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  HelpCircle,
  ShoppingBag,
  Layers,
  ChevronDown,
  Star,
  MessageCircle,
  Laptop,
  Check,
  Zap,
  BookOpen,
  MapPin,
  Flame,
  BadgeCheck
} from 'lucide-react';
import { Navbar } from '@/components/public/Navbar';
import { Footer } from '@/components/public/Footer';
import { HeroCarousel } from '@/components/public/HeroCarousel';
import { useSiteSettings } from '@/lib/useSiteSettings';

interface CourseItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  image_url?: string;
  is_published: boolean;
}

interface ComboItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  image_url?: string;
  is_published: boolean;
  combo_courses?: Array<{
    courses?: {
      id?: string;
      title: string;
    };
  }>;
}

export default function HomePage() {
  const { whatsappNumber } = useSiteSettings();
  const cleanPhone = (whatsappNumber || '5491100000000').replace(/\D/g, '');
  const heroWhatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    '¡Hola Academia Click Agro! Quisiera consultar sobre los cursos y programas de formación disponibles.'
  )}`;

  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [combos, setCombos] = useState<ComboItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'courses' | 'combos'>('all');
  const [openFaq, setOpenFaq] = useState<number | null>(0); // Primera pregunta abierta por defecto

  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const response = await fetch('/api/catalog');
        const data = await response.json().catch(() => null);

        const coursesData: CourseItem[] = data?.courses || [];
        const combosData: ComboItem[] = data?.combos || [];

        // Datos de contingencia técnica si la base de datos aún no tiene registros
        const fallbackCourses: CourseItem[] = [
          {
            id: 'c1',
            title: 'Manejo de Pulverizaciones Agrícolas de Precisión',
            slug: 'pulverizaciones-agricolas-precision',
            description: 'Calibración de boquillas, control de deriva por viento, adyuvantes y cálculo exacto de caudal por lote para maximizar eficacia de fitosanitarios.',
            price: 28500,
            image_url: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=800',
            is_published: true,
          },
          {
            id: 'c2',
            title: 'Gestión y Monitoreo Satelital de Cultivos con NDVI',
            slug: 'monitoreo-satelital-cultivos',
            description: 'Interpretación práctica de índices espectrales (NDVI, NDRE, NDWI), balance hídrico y detección temprana de anomalías en soja, maíz y trigo.',
            price: 32000,
            image_url: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=800',
            is_published: true,
          },
          {
            id: 'c3',
            title: 'Prescripciones Variables de Siembra y Fertilización',
            slug: 'prescripciones-variables-siembra-fertilizacion',
            description: 'Delimitación de ambientes productivos, mapeo de suelo y exportación de archivos Shapefile/ISOXML para monitores de maquinaria agrícola.',
            price: 35000,
            image_url: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=800',
            is_published: true,
          },
        ];

        const fallbackCombos: ComboItem[] = [
          {
            id: 'combo1',
            title: 'Diplomatura Integral en Agricultura de Precisión (Pack 3 en 1)',
            slug: 'diplomatura-agricultura-precision',
            description: 'Paquete formativo de élite que integra Pulverizaciones, Monitoreo Satelital y Prescripciones Variables con un 30% de ahorro directo.',
            price: 67000,
            image_url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80&w=800',
            is_published: true,
            combo_courses: [
              { courses: { title: 'Manejo de Pulverizaciones Agrícolas' } },
              { courses: { title: 'Gestión y Monitoreo Satelital con NDVI' } },
              { courses: { title: 'Prescripciones Variables de Siembra y Fertilización' } },
            ],
          },
        ];

        setCourses(coursesData.length > 0 ? coursesData : fallbackCourses);
        setCombos(combosData.length > 0 ? combosData : fallbackCombos);
      } catch (err) {
        console.error('Error cargando catálogo:', err);
      } finally {
        setLoadingCatalog(false);
      }
    }

    loadCatalog();
  }, []);

  // Preguntas frecuentes requeridas por negocio
  const faqs = [
    {
      q: '¿Cómo accedo a los cursos tras realizar el pago?',
      a: 'El acceso es 100% automático e inmediato. Una vez acreditado tu pago en Mercado Pago, nuestro sistema crea tu perfil en el campus virtual y te despacha un correo electrónico con tus credenciales y el botón de ingreso directo para comenzar a ver las clases al instante.',
    },
    {
      q: '¿Qué medios de pago aceptan?',
      a: 'Aceptamos todos los medios de pago disponibles a través de Mercado Pago en pesos argentinos (ARS): tarjetas de crédito en cuotas, tarjetas de débito, dinero disponible en cuenta de Mercado Pago y pagos en efectivo a través de Rapipago y Pago Fácil.',
    },
    {
      q: '¿Los cursos tienen horarios fijos o son a mi propio ritmo?',
      a: 'Son 100% a tu propio ritmo con acceso de por vida. Puedes ingresar las 24 horas del día, los 7 días de la semana, desde tu computadora, tablet o teléfono celular. Las clases quedan grabadas en alta definición y puedes repasar las lecciones tantas veces como lo necesites.',
    },
    {
      q: '¿Cómo se emiten y verifican los certificados oficiales?',
      a: 'Al completar el 100% de las lecciones del curso, se genera automáticamente tu Certificado Oficial en formato PDF de alta resolución. Cada diploma cuenta con un código alfanumérico único y un código QR que permite a contratistas, acopios y empleadores validar su autenticidad pública desde nuestra web (/validar).',
    },
    {
      q: '¿Puedo hacer consultas sobre los lotes y cultivos de mi propio campo?',
      a: '¡Por supuesto! Cada lección dispone de un panel exclusivo de preguntas donde los ingenieros agrónomos docentes responden tus consultas técnicas. Además, organizamos salas de mentoría en vivo periódicas por Zoom para analizar casos y lotes reales de los alumnos.',
    },
    {
      q: '¿Se emite factura por la compra del curso?',
      a: 'Sí, emitimos comprobantes fiscales oficiales válidos para deducir gastos profesionales o de empresa agropecuaria. Solo debes indicar tus datos de facturación al momento de inscribirte.',
    },
  ];

  // Testimonios de alumnos y productores del sector
  const testimonials = [
    {
      name: 'Ing. Agr. Martín Sgarlatta',
      role: 'Asesor Técnico y Productor Agrícola',
      location: 'Pergamino, Buenos Aires',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      comment:
        'Gracias al curso de monitoreo satelital pudimos ajustar la fertilización nitrogenada variable en 1.200 hectáreas de maíz. El retorno de inversión en ahorro de urea fue inmediato en la primera campaña.',
    },
    {
      name: 'Luciano Baravalle',
      role: 'Contratista Rural y Operador de Pulverizadora',
      location: 'Río Cuarto, Córdoba',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      comment:
        'El módulo de calibración de boquillas y deriva nos evitó pérdidas enormes por viento. El contenido es 100% práctico, explicado por ingenieros que realmente conocen el trabajo arriba de la máquina.',
    },
    {
      name: 'Ing. Agr. Sofía Rossi',
      role: 'Responsable de Agricultura de Precisión',
      location: 'Balcarce, Buenos Aires',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
      comment:
        'Las planillas de cálculo y la mentoría directa por Zoom marcan una diferencia abismal frente a otros cursos teóricos. Hoy genero mis propias prescripciones de siembra con total seguridad.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-agro-500 selection:text-white">
      <Navbar />

      {/* ========================================================================= */}
      {/* 1. SECCIÓN HERO (PORTADA PRINCIPAL)                                       */}
      {/* ========================================================================= */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
        
        {/* Carrusel de fondo con imágenes de 1920x1080 (fade 2s cada 7s) */}
        <HeroCarousel intervalMs={7000} durationMs={2000} />

        {/* Contenido Hero en capa superior al carrusel */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 py-20 lg:py-28 text-center">
          
          {/* Badge superior */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-950/80 border border-agro-400/40 text-agro-300 text-xs sm:text-sm font-bold tracking-wide backdrop-blur-md mb-8 animate-in fade-in slide-in-from-top-4 duration-500 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-agro-400 animate-pulse" />
            <span>Convocatoria Abierta • Cursos 100% Online & A tu Ritmo</span>
            <span className="hidden sm:inline text-agro-400/60">•</span>
            <span className="hidden sm:inline text-white/90">Edición 2026</span>
          </div>

          {/* Título de Alto Impacto Requerido */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] max-w-5xl mx-auto">
            <span className="text-white [-webkit-text-stroke:0.5px_rgba(209,213,219,0.7)] drop-shadow-[0_0_6px_rgba(209,213,219,0.75)] drop-shadow-[0_0_14px_rgba(156,163,175,0.6)] drop-shadow-[0_0_14px_rgba(0,0,0,0.95)] drop-shadow-[0_6px_24px_rgba(0,0,0,0.95)] drop-shadow-[0_10px_36px_rgba(0,0,0,0.85)]">
              Capacitación Agrícola de Precisión para el{' '}
            </span>
            <span className="text-agro-500 underline decoration-agro-500/50 underline-offset-8 [-webkit-text-stroke:0.4px_rgba(255,255,255,0.5)] drop-shadow-[0_0_8px_rgba(255,255,255,0.95)] drop-shadow-[0_0_20px_rgba(255,255,255,0.85)] drop-shadow-[0_4px_30px_rgba(255,255,255,0.6)] inline-block">
              Campo Moderno
            </span>
          </h1>

          {/* Subtítulo enfocado en productores, ingenieros y contratistas */}
          <p className="mt-6 text-base sm:text-lg md:text-xl text-white leading-relaxed max-w-3xl mx-auto font-medium [-webkit-text-stroke:0.4px_#ffffff] drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)]">
            Formación práctica y especializada para <strong className="text-white font-bold">productores, ingenieros agrónomos y contratistas rurales</strong>. Domina monitoreo satelital, prescripciones variables y pulverizaciones eficientes con datos reales de lote y certificación oficial validable.
          </p>

          {/* Botones de Llamada a la Acción (CTA) */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto relative z-20">
            {/* CTA 1: Catálogo de Cursos */}
            <a
              href="#catalogo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-agro-500 hover:bg-agro-600 active:scale-95 text-white font-bold text-sm sm:text-base shadow-xl shadow-agro-500/40 hover:shadow-agro-500/50 hover:-translate-y-0.5 transition-all duration-200"
            >
              <span>Ver Catálogo de Cursos</span>
              <ArrowRight className="w-5 h-5 text-white" />
            </a>

            {/* CTA 2: Contacto por WhatsApp dinámico */}
            <a
              href={heroWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900 text-white font-bold text-sm sm:text-base border border-zinc-700 hover:border-emerald-500/60 backdrop-blur-md shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              <svg className="w-5 h-5 fill-[#25D366]" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>Contactar por WhatsApp</span>
            </a>
          </div>

          {/* Badges de Confianza y Métricas del Sector */}
          <div className="mt-14 pt-8 border-t border-white/20 grid grid-cols-2 md:grid-cols-4 gap-6 text-left max-w-4xl mx-auto relative z-20">
            <div className="flex items-center gap-3 bg-zinc-950/75 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-agro-500/20 text-agro-400 flex items-center justify-center shrink-0 border border-agro-500/30">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-white">+1.500</p>
                <p className="text-xs text-zinc-300 font-medium">Alumnos del sector</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-zinc-950/75 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-white">100%</p>
                <p className="text-xs text-zinc-300 font-medium">Datos reales de lote</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-zinc-950/75 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-white">Zoom</p>
                <p className="text-xs text-zinc-300 font-medium">Mentoría con ingenieros</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-zinc-950/75 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-black text-white">Oficial</p>
                <p className="text-xs text-zinc-300 font-medium">Certificado con QR</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. PROPUESTA DE VALOR Y BENEFICIOS (CARDS INFORMATIVAS)                   */}
      {/* ========================================================================= */}
      <section className="relative z-20 py-20 lg:py-24 bg-white dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-agro-600 dark:text-agro-400 uppercase tracking-widest block mb-2">
              Propuesta de Valor Click Agro
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 dark:text-white tracking-tight">
              Diseñado para el ritmo del productor y asesor
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-3 leading-relaxed">
              Combinamos rigor agronómico con tecnología accesible para que apliques cada conocimiento en tu campo desde el primer día.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Beneficio 1 */}
            <div className="p-7 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-agro-500/50 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-13 h-13 rounded-2xl bg-agro-500/10 text-agro-600 dark:text-agro-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Flexibilidad 100% Online
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Acceso 24/7 de por vida desde cualquier dispositivo o ubicación rural. Estudia a tu propio ritmo, sin horarios rígidos y compatible con tus campañas agrícolas.
                </p>
              </div>
              <div className="pt-5 mt-4 border-t border-zinc-200/60 dark:border-zinc-800 text-[11px] font-bold text-agro-600 dark:text-agro-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Sin fechas límite de cursada</span>
              </div>
            </div>

            {/* Beneficio 2 */}
            <div className="p-7 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-agro-500/50 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-13 h-13 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Certificados Oficiales Validables
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Emisión inmediata de diplomas digitales en alta resolución con código QR único para validación pública en línea ante empresas, acopios y contratistas.
                </p>
              </div>
              <div className="pt-5 mt-4 border-t border-zinc-200/60 dark:border-zinc-800 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>Verificable con código QR</span>
              </div>
            </div>

            {/* Beneficio 3 */}
            <div className="p-7 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-agro-500/50 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-13 h-13 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Clases Prácticas y Material Descargable
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Planillas Excel de cálculo agronómico, guías en PDF y ejercicios aplicados directamente a la toma de decisiones en maquinaria y lotes comerciales.
                </p>
              </div>
              <div className="pt-5 mt-4 border-t border-zinc-200/60 dark:border-zinc-800 text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Archivos listos para usar en campo</span>
              </div>
            </div>

            {/* Beneficio 4 */}
            <div className="p-7 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-agro-500/50 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-13 h-13 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Foro Directo con Especialistas
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Consultas continuas debajo de cada clase y sesiones periódicas por Zoom con los profesores para evacuar inquietudes técnicas sobre tus propios cultivos.
                </p>
              </div>
              <div className="pt-5 mt-4 border-t border-zinc-200/60 dark:border-zinc-800 text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Interacción con ingenieros agrónomos</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CATÁLOGO DINÁMICO DE CURSOS Y COMBOS (#catalogo)                       */}
      {/* ========================================================================= */}
      <section id="catalogo" className="relative z-20 py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full scroll-mt-20">
        
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-agro-100 dark:bg-agro-950/60 text-agro-700 dark:text-agro-300 text-xs font-bold mb-3 border border-agro-300 dark:border-agro-800">
            <Sprout className="w-3.5 h-3.5" />
            <span>Oferta Académica Actualizada</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-950 dark:text-white tracking-tight">
            Programas de Formación Profesional
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-3 leading-relaxed">
            Elige el programa individual que mejor se adapte a tus necesidades técnicas o aprovecha nuestros combos formativos con descuento directo.
          </p>

          {/* Filtros de Categoría */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeFilter === 'all'
                  ? 'bg-agro-500 text-white shadow-md shadow-agro-500/20'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
              }`}
            >
              Todos los Programas ({courses.length + combos.length})
            </button>
            <button
              onClick={() => setActiveFilter('courses')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeFilter === 'courses'
                  ? 'bg-agro-500 text-white shadow-md shadow-agro-500/20'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
              }`}
            >
              Cursos Individuales ({courses.length})
            </button>
            <button
              onClick={() => setActiveFilter('combos')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'combos'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Combos Promocionales ({combos.length})</span>
            </button>
          </div>
        </div>

        {/* Skeleton de Carga */}
        {loadingCatalog ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 animate-pulse">
                <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
                <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md w-3/4" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-full" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-5/6" />
                <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* 1. Tarjetas de Cursos Individuales */}
            {(activeFilter === 'all' || activeFilter === 'courses') &&
              courses.map((course) => (
                <div
                  key={course.id}
                  className="group bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-agro-500/40 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Portada */}
                    <div className="relative w-full h-52 bg-zinc-950 overflow-hidden flex items-center justify-center p-2">
                      {course.image_url ? (
                        <img
                          src={course.image_url}
                          alt={course.title}
                          className="max-h-full max-w-full object-contain p-1 group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/80 rounded-2xl border border-zinc-800">
                          <BookOpen className="w-9 h-9 mb-2 text-agro-500/70" />
                          <span className="text-xs font-semibold text-zinc-400">Academia Click Agro</span>
                        </div>
                      )}
                      <div className="absolute top-3.5 left-3.5 bg-zinc-950/85 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-bold text-white border border-white/10 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-agro-400" />
                        <span>Curso Especializado</span>
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-6 sm:p-7 space-y-3.5">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white line-clamp-2 group-hover:text-agro-600 dark:group-hover:text-agro-400 transition-colors leading-snug">
                        {course.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                        {course.description}
                      </p>

                      {/* Atributos incluidos */}
                      <div className="pt-3 space-y-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-agro-500 shrink-0" />
                          <span>Clases en video HD con acceso ilimitado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-agro-500 shrink-0" />
                          <span>Planillas Excel y guías de campo descargables</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-agro-500 shrink-0" />
                          <span>Certificado Oficial Click Agro con código QR</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer con Precio y Botón CTA */}
                  <div className="p-6 sm:p-7 pt-0">
                    <div className="flex items-baseline justify-between mb-4">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-400 block font-bold tracking-wider">Inversión Final</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                            ${Number(course.price).toLocaleString('es-AR')}
                          </span>
                          <span className="text-xs text-zinc-400 font-bold">ARS</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-agro-600 dark:text-agro-400 bg-agro-50 dark:bg-agro-950/40 px-2.5 py-1 rounded-lg border border-agro-200 dark:border-agro-800">
                        Pago único
                      </span>
                    </div>

                    <Link
                      href={`/checkout?course_id=${course.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-agro-500 hover:bg-agro-600 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-agro-500/25 transition-all"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Inscribirme al Curso</span>
                    </Link>
                  </div>
                </div>
              ))}

            {/* 2. Tarjetas de Combos Promocionales */}
            {(activeFilter === 'all' || activeFilter === 'combos') &&
              combos.map((combo) => (
                <div
                  key={combo.id}
                  className="group bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 rounded-3xl border-2 border-amber-400/80 dark:border-amber-400/60 overflow-hidden shadow-xl flex flex-col justify-between relative transform hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Insignia visual destacada */}
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 text-xs font-black uppercase px-4 py-1.5 rounded-bl-2xl shadow-md z-10 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-950" />
                    <span>Ahorrá un 25%</span>
                  </div>

                  <div>
                    {/* Portada */}
                    <div className="relative w-full h-52 bg-zinc-950 overflow-hidden flex items-center justify-center p-2">
                      {combo.image_url ? (
                        <img
                          src={combo.image_url}
                          alt={combo.title}
                          className="max-h-full max-w-full object-contain p-1 group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/80 rounded-2xl border border-zinc-800">
                          <Layers className="w-9 h-9 mb-2 text-amber-500/70" />
                          <span className="text-xs font-semibold text-zinc-400">Pack Academia Click Agro</span>
                        </div>
                      )}
                      <div className="absolute top-3.5 left-3.5 bg-agro-500 text-white px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Pack Formativo</span>
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-6 sm:p-7 space-y-3.5">
                      <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors leading-snug">
                        {combo.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                        {combo.description}
                      </p>

                      {/* Lista de Cursos Incluidos */}
                      <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-2 mt-3">
                        <span className="text-[11px] uppercase font-black text-amber-400 block tracking-wider">
                          Programas incluidos en este combo:
                        </span>
                        {(combo.combo_courses || []).map((cc: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-zinc-200">
                            <span className="w-2 h-2 rounded-full bg-agro-400 shrink-0" />
                            <span className="truncate">{cc.courses?.title || 'Curso incluido'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer con Precio y Botón CTA */}
                  <div className="p-6 sm:p-7 pt-0">
                    <div className="flex items-baseline justify-between mb-4">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-400 block font-bold tracking-wider">Inversión Paquete</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-amber-400 tracking-tight">
                            ${Number(combo.price).toLocaleString('es-AR')}
                          </span>
                          <span className="text-xs text-zinc-400 font-bold">ARS</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-zinc-950 bg-amber-400 px-2.5 py-1 rounded-lg">
                        Acceso Total
                      </span>
                    </div>

                    <Link
                      href={`/checkout?combo_id=${combo.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
                    >
                      <Layers className="w-4 h-4 text-zinc-950" />
                      <span>Adquirir Combo Completo</span>
                    </Link>
                  </div>
                </div>
              ))}

          </div>
        )}

      </section>

      {/* ========================================================================= */}
      {/* 4. SECCIÓN DE TESTIMONIOS / CASOS DE ÉXITO                                */}
      {/* ========================================================================= */}
      <section className="relative z-20 py-20 lg:py-24 bg-zinc-900 text-white border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-agro-400 uppercase tracking-widest block mb-2">
              Comunidad Agropecuaria
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Respaldado por quienes trabajan el lote
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 mt-2 leading-relaxed">
              Ingenieros agrónomos, contratistas y productores de las principales zonas productivas de Argentina capacitan a sus equipos con Click Agro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, index) => (
              <div
                key={index}
                className="bg-zinc-950/80 border border-zinc-800 rounded-3xl p-7 flex flex-col justify-between hover:border-agro-500/50 hover:shadow-xl transition-all duration-300 space-y-6"
              >
                <div className="space-y-4">
                  {/* Estrellas */}
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>

                  {/* Comentario */}
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed italic">
                    "{t.comment}"
                  </p>
                </div>

                {/* Perfil del Alumno */}
                <div className="flex items-center gap-3.5 pt-4 border-t border-zinc-800/80">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 border border-agro-500/40">
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{t.name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-agro-400" />
                    </h4>
                    <p className="text-[11px] text-zinc-400">{t.role}</p>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-zinc-500" />
                      <span>{t.location}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SECCIÓN DE PREGUNTAS FRECUENTES (FAQ ACORDEÓN)                         */}
      {/* ========================================================================= */}
      <section id="faq" className="relative z-20 py-20 lg:py-28 max-w-4xl mx-auto px-4 sm:px-6 w-full scroll-mt-20">
        
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-agro-600 dark:text-agro-400 uppercase tracking-widest block mb-2">
            Despeja tus Dudas
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 dark:text-white tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
            Todo lo que necesitas saber sobre el proceso de compra, cursada y acreditación oficial.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 hover:text-agro-600 dark:hover:text-agro-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isOpen ? 'bg-agro-500 text-white rotate-180' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/80 pt-4 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 6. BANNER DE CIERRE / CTA FINAL                                           */}
      {/* ========================================================================= */}
      <section className="relative z-20 bg-gradient-to-r from-agro-900 via-agro-800 to-zinc-950 text-white py-16 px-4 sm:px-6 lg:px-8 border-t border-agro-700/40 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mx-auto border border-white/20">
            <Sprout className="w-7 h-7 text-agro-300" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            ¿Listo para llevar tus lotes al siguiente nivel de precisión?
          </h2>
          <p className="text-sm sm:text-base text-agro-100 max-w-2xl mx-auto leading-relaxed">
            Inscríbete hoy mismo con acreditación inmediata de Mercado Pago o consulta con un asesor técnico por WhatsApp ante cualquier duda de inscripción.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href="#catalogo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-black text-sm shadow-xl transition-all"
            >
              <span>Explorar Todos los Cursos</span>
              <ArrowRight className="w-4 h-4 text-zinc-950" />
            </a>
            <a
              href={heroWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-lg transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chatear con un Asesor</span>
            </a>
          </div>
        </div>
      </section>

      {/* Pie de Página */}
      <Footer />
    </div>
  );
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/image';
import Image from 'next/image';
import { 
  ShieldCheck, 
  ShoppingBag, 
  ArrowLeft, 
  Check, 
  CreditCard, 
  Tag, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get('course_id');
  const comboId = searchParams.get('combo_id');

  const [item, setItem] = useState<any>(null);
  const [isCombo, setIsCombo] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Cargar datos del producto y sesión del usuario
  useEffect(() => {
    async function loadItem() {
      setIsLoading(true);
      try {
        // Cargar datos del alumno si ya está autenticado
        const { data: authData } = await supabaseBrowser.auth.getUser();
        const currentUser = authData?.user;
        if (currentUser) {
          if (currentUser.email) setEmail(currentUser.email);
          const meta = currentUser.user_metadata || {};
          if (meta.first_name) setFirstName(meta.first_name);
          if (meta.last_name) setLastName(meta.last_name);
          if (meta.phone) setPhone(meta.phone);

          let nameToSplit = meta.full_name;
          if (!nameToSplit) {
            const { data: prof } = await supabaseBrowser
              .from('profiles')
              .select('full_name')
              .eq('id', currentUser.id)
              .maybeSingle();
            if (prof?.full_name) nameToSplit = prof.full_name;
          }

          if ((!meta.first_name || !meta.last_name) && nameToSplit) {
            const parts = nameToSplit.trim().split(' ');
            if (!meta.first_name) setFirstName(parts[0] || '');
            if (!meta.last_name) setLastName(parts.slice(1).join(' ') || '');
          }
        }

        if (courseId) {
          const { data: course } = await supabaseBrowser
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .maybeSingle();

          setItem(course || {
            id: courseId,
            title: 'Curso de Especialización Agrícola',
            description: 'Acceso completo a lecciones en video, planillas y mentorías en vivo.',
            price: 28000,
          });
          setIsCombo(false);
        } else if (comboId) {
          const { data: combo } = await supabaseBrowser
            .from('combos')
            .select('*, combo_courses(courses(title))')
            .eq('id', comboId)
            .maybeSingle();

          setItem(combo || {
            id: comboId,
            title: 'Combo Formativo Click Agro',
            description: 'Paquete integral con múltiples programas incluidos.',
            price: 55000,
          });
          setIsCombo(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadItem();
  }, [courseId, comboId]);

  // 2. Cálculo interactivo del precio
  const originalPrice = Number(item?.price || 0);
  let discountAmount = 0;

  if (appliedCoupon) {
    if (Number(appliedCoupon.discount_percent || 0) > 0) {
      discountAmount = (originalPrice * Number(appliedCoupon.discount_percent)) / 100;
    } else if (Number(appliedCoupon.discount_amount || 0) > 0) {
      discountAmount = Number(appliedCoupon.discount_amount);
    } else if (appliedCoupon.discount_type === 'percentage') {
      discountAmount = (originalPrice * Number(appliedCoupon.discount_value)) / 100;
    } else if (appliedCoupon.discount_value) {
      discountAmount = Number(appliedCoupon.discount_value);
    }
  }

  const finalPrice = Math.max(0, originalPrice - discountAmount);

  // 3. Validar Cupón de Descuento
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim() || isValidatingCoupon) return;

    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const cleanCode = couponCode.trim().replace(/\s+/g, '');

      const { data: coupon, error } = await supabaseBrowser
        .from('coupons')
        .select('*')
        .ilike('code', cleanCode)
        .maybeSingle();

      if (error || !coupon) {
        setCouponError('El cupón ingresado no existe o no es válido.');
        setAppliedCoupon(null);
        return;
      }

      if (!coupon.is_active) {
        setCouponError('Este cupón se encuentra inactivo.');
        setAppliedCoupon(null);
        return;
      }

      const expiryDate = coupon.valid_until || coupon.expires_at;
      if (expiryDate && new Date(expiryDate) < new Date()) {
        setCouponError('Este cupón ya ha expirado.');
        setAppliedCoupon(null);
        return;
      }

      if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
        setCouponError('Este cupón alcanzó el límite de usos permitidos.');
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon(coupon);
      setCouponError(null);
    } catch {
      setCouponError('Error al validar el cupón.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // 4. Iniciar Checkout y Simular Pago Exitoso con Mercado Pago
  const handleProceedToPayment = async () => {
    if (!firstName.trim()) {
      setErrorMsg('Por favor, ingresa el nombre del alumno.');
      return;
    }

    if (!lastName.trim()) {
      setErrorMsg('Por favor, ingresa el apellido del alumno.');
      return;
    }

    if (!phone.trim() || phone.trim().replace(/\D/g, '').length < 6) {
      setErrorMsg('Por favor, ingresa un número de teléfono o WhatsApp válido.');
      return;
    }

    if (!email || !email.includes('@')) {
      setErrorMsg('Ingresa un correo electrónico válido para recibir tu acceso al curso.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      const payload = {
        course_id: isCombo ? null : item?.id,
        combo_id: isCombo ? item?.id : null,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: fullName,
        phone: phone.trim(),
        user_email: email.trim().toLowerCase(),
      };

      // Simular que el pago se realizó correctamente en Mercado Pago y acreditar matrícula
      const response = await fetch('/api/checkout/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Ocurrió un error al procesar el pago.');
      }

      // Si el servidor devolvió contraseña temporal, iniciar sesión automáticamente en el navegador
      if (data.temp_password) {
        try {
          await supabaseBrowser.auth.signInWithPassword({
            email: payload.user_email,
            password: data.temp_password,
          });
        } catch (authErr) {
          console.warn('Error al auto-iniciar sesión:', authErr);
        }
      }

      // Redirigir a la pantalla de éxito con el curso acreditado
      window.location.href = data.redirect_url;
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Ocurrió un error al procesar la sesión de pago.');
      setIsSubmitting(false);
    }
  };

  if (isLoading || !item) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-4">
        <Loader2 className="w-10 h-10 text-agro-500 animate-spin mb-4" />
        <p className="text-xs text-zinc-400 font-medium">Preparando tu resumen de compra...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Header Seguro */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
              <Image src="/logo.png" alt="Click Agro" fill sizes="32px" className="object-contain" priority />
            </div>
            <span className="text-sm font-black tracking-tight text-zinc-900 dark:text-white">
              ACADEMIA <span className="text-agro-600 dark:text-agro-400">CLICK AGRO</span>
            </span>
          </a>

          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-agro-500" />
            <span className="font-semibold hidden sm:inline">Checkout Seguro 256-bit</span>
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 lg:py-14">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al catálogo</span>
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMNA IZQUIERDA: DATOS DEL ALUMNO Y CUPÓN (7 columnas) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Paso 1: Datos Personales del Alumno */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-agro-500 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Datos del Alumno y Acceso al Aula
                </h2>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Ingresa tus datos reales. Tu nombre y apellido figurarán en tu perfil de cursada y en tus certificados oficiales emitidos.
              </p>

              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Nombre del Alumno *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej: Martín"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-agro-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Apellido del Alumno *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej: Gómez"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-agro-500"
                  />
                </div>
              </div>

              {/* Teléfono y Correo Electrónico */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej: +54 9 11 1234-5678"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-agro-500"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Para contacto directo, novedades y coordinación de clases.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Correo Electrónico de Acceso *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-agro-500"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    A este email te llegará tu enlace y clave de acceso.
                  </p>
                </div>
              </div>
            </div>

            {/* Paso 2: Cupón de Descuento */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  ¿Tienes un cupón de descuento?
                </h2>
              </div>

              <form onSubmit={handleApplyCoupon} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Código promocional (ej: CLICKAGRO20)"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-agro-500"
                />
                <button
                  type="submit"
                  disabled={isValidatingCoupon || !couponCode.trim()}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 text-white font-bold text-xs transition-colors disabled:opacity-50"
                >
                  {isValidatingCoupon ? 'Validando...' : 'Aplicar'}
                </button>
              </form>

              {appliedCoupon && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-agro-50 dark:bg-agro-950/40 border border-agro-300 dark:border-agro-800 text-xs text-agro-800 dark:text-agro-300 font-semibold animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-agro-600" />
                    <span>
                      ¡Cupón <strong>{appliedCoupon.code}</strong> aplicado con éxito!
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode('');
                    }}
                    className="text-[11px] underline text-zinc-500 hover:text-red-500 ml-2"
                  >
                    Quitar
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{couponError}</span>
                </p>
              )}
            </div>

            {/* Garantía de Seguridad */}
            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3 text-xs text-zinc-500">
              <CreditCard className="w-5 h-5 text-agro-600 dark:text-agro-400 shrink-0" />
              <span>
                Tus pagos son procesados de forma cifrada a través de <strong>Mercado Pago</strong>. Academia Click Agro nunca tiene acceso a los datos de tu tarjeta.
              </span>
            </div>

          </div>

          {/* COLUMNA DERECHA: RESUMEN DEL PEDIDO (5 columnas) */}
          <div className="lg:col-span-5 sticky top-28">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-xl space-y-6">
              
              <div>
                <span className="text-[10px] font-bold text-agro-600 dark:text-agro-400 uppercase tracking-wider block">
                  Resumen de Inscripción
                </span>
                <h3 className="text-lg font-black text-zinc-950 dark:text-white mt-0.5">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Desglose de Precios */}
              <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Precio de lista:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                    ${originalPrice.toLocaleString('es-AR')} ARS
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-agro-600 dark:text-agro-400 font-bold">
                    <span>Descuento ({appliedCoupon.code}):</span>
                    <span>- ${discountAmount.toLocaleString('es-AR')} ARS</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-3 border-t border-zinc-200 dark:border-zinc-800 text-base">
                  <span className="font-black text-zinc-900 dark:text-white">Total a Pagar:</span>
                  <span className="text-2xl font-black text-agro-600 dark:text-agro-400">
                    ${finalPrice.toLocaleString('es-AR')} <small className="text-xs font-bold text-zinc-400">ARS</small>
                  </span>
                </div>
              </div>

              {/* Mensaje de error general */}
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Botón de Pago Principal */}
              <button
                onClick={handleProceedToPayment}
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-agro-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Acreditando pago y habilitando acceso...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    <span>PAGAR CON MERCADOPAGO</span>
                  </>
                )}
              </button>

              <div className="p-3 rounded-xl bg-agro-50 dark:bg-agro-950/30 border border-agro-200 dark:border-agro-900/50 text-center space-y-1">
                <p className="text-xs font-bold text-agro-700 dark:text-agro-300 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Simulación de Pruebas Activa
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Al presionar se simula el pago de Mercado Pago acreditado con éxito y se habilita el acceso instantáneo a tu curso.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-4">
          <Loader2 className="w-10 h-10 text-agro-500 animate-spin mb-4" />
          <p className="text-xs text-zinc-400 font-medium">Cargando pasarela de pago segura...</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

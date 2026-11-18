'use client';

import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  Check, 
  X,
  Percent,
  DollarSign
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Formulario nuevo cupón
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 20,
    max_uses: '',
    expires_at: '',
    is_active: true,
  });

  const loadCoupons = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabaseBrowser
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      setCoupons(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanCode = formData.code.trim().toUpperCase().replace(/\s+/g, '');

      const isPercent = formData.discount_type === 'percentage';
      const payload = {
        code: cleanCode,
        discount_percent: isPercent ? Number(formData.discount_value) : 0,
        discount_amount: !isPercent ? Number(formData.discount_value) : 0,
        max_uses: formData.max_uses ? Number(formData.max_uses) : null,
        valid_until: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        is_active: formData.is_active,
        uses_count: 0,
      };

      const { error } = await supabaseBrowser.from('coupons').insert(payload);
      if (error) throw error;

      setIsModalOpen(false);
      setFormData({
        code: '',
        discount_type: 'percentage',
        discount_value: 20,
        max_uses: '',
        expires_at: '',
        is_active: true,
      });
      loadCoupons();
    } catch (err: any) {
      alert(`Error al crear cupón: ${err?.message || err}`);
    }
  };

  const toggleCouponStatus = async (id: string, currentStatus: boolean) => {
    await supabaseBrowser
      .from('coupons')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !currentStatus } : c))
    );
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('¿Eliminar cupón promocional permanentemente?')) return;
    await supabaseBrowser.from('coupons').delete().eq('id', id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
            Sistema de Cupones Promocionales
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Crea códigos de descuento para campañas de marketing en ARS o porcentajes especiales.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-xs sm:text-sm shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Cupón</span>
        </button>
      </div>

      {/* 2. Tabla de Cupones */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 p-5 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
          <thead className="bg-zinc-50 dark:bg-zinc-900/60 uppercase text-[10px] font-bold text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Descuento</th>
              <th className="px-4 py-3">Usos Registrados</th>
              <th className="px-4 py-3">Expiración</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-zinc-400">
                  No hay cupones creados aún.
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-700/30">
                  <td className="px-4 py-3.5 font-mono font-bold text-zinc-900 dark:text-white">
                    {coupon.code}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-agro-600 dark:text-agro-400">
                    {Number(coupon.discount_percent || 0) > 0
                      ? `${coupon.discount_percent}% OFF`
                      : `$${Number(coupon.discount_amount || coupon.discount_value || 0).toLocaleString('es-AR')} ARS`}
                  </td>
                  <td className="px-4 py-3.5">
                    {coupon.uses_count} {coupon.max_uses ? `/ ${coupon.max_uses}` : 'usos (sin límite)'}
                  </td>
                  <td className="px-4 py-3.5 text-zinc-400">
                    {(coupon.valid_until || coupon.expires_at)
                      ? new Date(coupon.valid_until || coupon.expires_at).toLocaleDateString('es-AR')
                      : 'Sin vencimiento'}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => toggleCouponStatus(coupon.id, coupon.is_active)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                        coupon.is_active
                          ? 'bg-agro-100 text-agro-700 dark:bg-agro-900/40 dark:text-agro-300'
                          : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
                      }`}
                    >
                      {coupon.is_active ? 'Activo' : 'Pausado'}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleDeleteCoupon(coupon.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* MODAL CREAR CUPÓN                                                         */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              Nuevo Cupón de Descuento
            </h2>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Código del Cupón *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="EJ: CLICKAGRO20"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Tipo de Descuento
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo (ARS)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Valor del Descuento *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Límite de Usos (Opcional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    placeholder="Sin límite"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold"
                >
                  Guardar Cupón
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

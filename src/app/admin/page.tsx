'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Users, 
  BookOpen, 
  CreditCard, 
  Search, 
  ArrowUpRight, 
  TrendingUp,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalStudents: 0,
    activeCoursesCount: 0,
    topCourses: [] as any[],
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/overview');
        const data = await res.json();

        if (data.success) {
          setMetrics(data.metrics);
          setTransactions(data.transactions || []);
          setStudents(data.students || []);
        } else {
          throw new Error(data.error || 'Error al cargar métricas');
        }
      } catch (error) {
        console.error('Error cargando métricas administrativas:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAdminData();
  }, []);

  // Filtrado reactivo de estudiantes por nombre, email o teléfono
  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (s.full_name || '').toLowerCase().includes(query);
    const emailMatch = (s.email || '').toLowerCase().includes(query);
    const phoneMatch = (s.phone || '').toLowerCase().includes(query);
    return nameMatch || emailMatch || phoneMatch;
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* 1. Header con Resumen */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-agro-500 animate-pulse" />
            <span className="text-xs font-bold text-agro-600 dark:text-agro-400 uppercase tracking-wider">
              Consola de Dirección Académica
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white mt-1">
            Tablero General de Métricas y Ventas
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Seguimiento de compras de Mercado Pago, alumnos activos y cursos más solicitados en Academia Click Agro.
          </p>
        </div>
      </div>

      {/* 2. Tarjetas de Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Ingresos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Ingresos Totales (ARS)
            </span>
            <div className="w-10 h-10 rounded-xl bg-agro-100 dark:bg-agro-900/40 text-agro-600 dark:text-agro-400 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white mt-3">
            ${metrics.totalRevenue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-agro-600 dark:text-agro-400 mt-2 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Cobros confirmados vía Mercado Pago</span>
          </div>
        </div>

        {/* Alumnos Matriculados */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Alumnos Matriculados
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white mt-3">
            {metrics.totalStudents}
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            Productores y técnicos con acceso activo
          </p>
        </div>

        {/* Programas Académicos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Cursos Disponibles
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white mt-3">
            {metrics.activeCoursesCount}
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            Contenidos en catálogo activo
          </p>
        </div>

        {/* Transacciones Registradas */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Órdenes de Pago
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white mt-3">
            {transactions.length}
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            Auditoría en tiempo real
          </p>
        </div>
      </div>

      {/* 3. Bloque Doble: Cursos más Vendidos + Últimas Transacciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Cursos más Vendidos */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Cursos con Mayor Demanda
            </h3>
            <span className="text-xs text-zinc-400">Por volumen de ventas</span>
          </div>

          <div className="space-y-3.5">
            {metrics.topCourses.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">
                Aún no hay compras registradas en el período.
              </p>
            ) : (
              metrics.topCourses.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-700/40">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {c.title}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {c.count} {c.count === 1 ? 'matriculado' : 'matriculados'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-agro-600 dark:text-agro-400 shrink-0">
                    ${c.revenue.toLocaleString('es-AR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Últimas Transacciones de Mercado Pago */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-agro-500" />
              Últimas Transacciones (Mercado Pago)
            </h3>
            <span className="text-xs text-zinc-400">IPN Webhooks</span>
          </div>

          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">
                Esperando primeras notificaciones de pago...
              </p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-700/40 text-xs">
                  <div className="min-w-0 pr-3">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {tx.profiles?.full_name || tx.profiles?.email || 'Comprador'}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      ID Pago: {tx.payment_id || 'N/A'} • {new Date(tx.created_at).toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                      ${Number(tx.amount_paid).toLocaleString('es-AR')}
                    </span>
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                      tx.payment_status === 'approved' 
                        ? 'bg-agro-100 text-agro-700 dark:bg-agro-900/40 dark:text-agro-300' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {tx.payment_status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 4. Lista Detallada de Estudiantes y Buscador */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Directorio de Estudiantes Matriculados
            </h3>
            <p className="text-xs text-zinc-500">
              Listado completo de alumnos y asignaciones de cursos
            </p>
          </div>

          {/* Buscador reactivo */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, email o teléfono..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-agro-500"
            />
          </div>
        </div>

        {/* Tabla Responsiva */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 uppercase text-[10px] font-bold text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                <th className="px-4 py-3">Estudiante</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Teléfono / WhatsApp</th>
                <th className="px-4 py-3">Cursos Asignados</th>
                <th className="px-4 py-3">Fecha de Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-zinc-400">
                    No se encontraron alumnos con ese criterio de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-700/30 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-zinc-900 dark:text-zinc-100">
                      {st.full_name || 'Sin nombre registrado'}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-400">
                      {st.email}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                      {st.phone || <span className="text-zinc-400 italic font-sans">No registrado</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {st.courses && st.courses.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {st.courses.map((cName: string, i: number) => (
                            <span 
                              key={i} 
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-agro-50 dark:bg-agro-950/40 text-agro-700 dark:text-agro-400 border border-agro-300 dark:border-agro-800/60"
                            >
                              {cName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">Sin cursos activos</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400">
                      {new Date(st.created_at).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

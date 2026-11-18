import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/overview
 * Retorna las métricas generales de ventas, alumnos matriculados y transacciones
 * utilizando permisos de servicio administrativo (supabaseAdmin) para evitar
 * bloqueos de Row-Level Security (RLS).
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Obtener todas las inscripciones con relaciones
    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
      .from('enrollments')
      .select('*, courses(id, title), combos(id, title), profiles(id, email, full_name)')
      .order('created_at', { ascending: false });

    if (enrollmentsError) {
      console.error('[ADMIN_OVERVIEW_ENROLLMENTS_ERROR]', enrollmentsError);
    }

    const allEnrollments = enrollments || [];
    const approvedEnrollments = allEnrollments.filter((e) => e.payment_status === 'approved');

    // 2. Cálculo de métricas
    const totalRevenue = approvedEnrollments.reduce(
      (sum, item) => sum + Number(item.amount_paid || 0),
      0
    );

    // Conteo de alumnos únicos matriculados
    const uniqueStudentIds = new Set(approvedEnrollments.map((e) => e.user_id));

    // Ranking de cursos y combos más vendidos
    const courseSalesMap: Record<string, { title: string; count: number; revenue: number }> = {};
    approvedEnrollments.forEach((e) => {
      const title = e.courses?.title || (e.combos ? `Combo: ${e.combos.title}` : 'Curso Individual');
      if (!courseSalesMap[title]) {
        courseSalesMap[title] = { title, count: 0, revenue: 0 };
      }
      courseSalesMap[title].count += 1;
      courseSalesMap[title].revenue += Number(e.amount_paid || 0);
    });

    const topCourses = Object.values(courseSalesMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    // 3. Cantidad de cursos en el catálogo
    const { count: courseCount } = await supabaseAdmin
      .from('courses')
      .select('*', { count: 'exact', head: true });

    // 4. Directorio de perfiles de estudiantes
    const { data: profilesList, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('[ADMIN_OVERVIEW_PROFILES_ERROR]', profilesError);
    }

    // 5. Consultar usuarios en Supabase Auth para extraer números de teléfono y metadata
    let authUsersMap = new Map<string, any>();
    try {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      (usersData?.users || []).forEach((u) => {
        authUsersMap.set(u.id, u);
      });
    } catch (authErr) {
      console.warn('[ADMIN_OVERVIEW_AUTH_LIST_WARN]', authErr);
    }

    // 6. Enriquecer los perfiles de estudiantes
    const students = (profilesList || []).map((prof: any) => {
      const authUser = authUsersMap.get(prof.id);
      const meta = authUser?.user_metadata || {};
      const resolvedName =
        prof.full_name ||
        [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
        meta.full_name ||
        'Sin nombre registrado';
      const phone = meta.phone || null;

      const userCourses = approvedEnrollments
        .filter((e) => e.user_id === prof.id)
        .map((e) => e.courses?.title || (e.combos ? `Combo: ${e.combos.title}` : 'Curso'));

      return {
        id: prof.id,
        email: prof.email,
        full_name: resolvedName,
        phone,
        role: prof.role,
        courses: Array.from(new Set(userCourses)),
        created_at: prof.created_at,
      };
    });

    // 7. Enriquecer transacciones con nombres reales de compradores
    const transactions = allEnrollments.slice(0, 10).map((tx: any) => {
      const authUser = authUsersMap.get(tx.user_id);
      const meta = authUser?.user_metadata || {};
      const resolvedBuyerName =
        tx.profiles?.full_name ||
        [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
        meta.full_name ||
        tx.profiles?.email ||
        'Comprador';

      return {
        ...tx,
        profiles: {
          ...tx.profiles,
          full_name: resolvedBuyerName,
        },
      };
    });

    const metrics = {
      totalRevenue,
      totalStudents: uniqueStudentIds.size > 0 ? uniqueStudentIds.size : students.length,
      activeCoursesCount: courseCount || 0,
      topCourses,
    };

    return NextResponse.json({
      success: true,
      metrics,
      transactions,
      students,
    });
  } catch (error: any) {
    console.error('[ADMIN_OVERVIEW_EXCEPTION]', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error al obtener métricas del panel administrativo',
      },
      { status: 500 }
    );
  }
}

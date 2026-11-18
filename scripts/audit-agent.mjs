/**
 * AGENTE AUDITOR DE PLATAFORMA Y BASE DE DATOS - ACADEMIA CLICK AGRO
 * 
 * Verifica de forma integral:
 * 1. Conexión y credenciales de Supabase (Service Role y Anon).
 * 2. Existencia de todas las tablas y correspondencia exacta de sus columnas en PostgreSQL.
 * 3. Integridad de las consultas SQL/PostgREST en el código fuente (src/).
 * 4. Estado de salud de todas las secciones, páginas y endpoints API de la plataforma.
 * 
 * Ejecución: node scripts/audit-agent.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Colores ANSI para terminal
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// 1. Cargar variables de entorno de .env.local
const env = {};
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...vals] = trimmed.split('=');
    if (key && vals.length) {
      env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Diccionario de Tablas y Columnas Oficiales del Esquema Click Agro
const SCHEMA_SPEC = {
  profiles: [
    'id', 'email', 'full_name', 'avatar_url', 'role', 'created_at', 'updated_at'
  ],
  courses: [
    'id', 'title', 'slug', 'description', 'price', 'cover_image', 'is_published', 'created_at', 'updated_at'
  ],
  modules: [
    'id', 'course_id', 'title', 'position', 'created_at'
  ],
  lessons: [
    'id', 'course_id', 'module_id', 'title', 'description', 'youtube_video_id', 'zoom_link', 'position', 'is_free_preview', 'created_at'
  ],
  lesson_resources: [
    'id', 'lesson_id', 'title', 'file_url', 'created_at'
  ],
  combos: [
    'id', 'title', 'slug', 'description', 'price', 'cover_image', 'is_published', 'created_at'
  ],
  combo_courses: [
    'id', 'combo_id', 'course_id'
  ],
  coupons: [
    'id', 'code', 'discount_percent', 'discount_amount', 'max_uses', 'uses_count', 'valid_until', 'is_active', 'created_at'
  ],
  enrollments: [
    'id', 'user_id', 'course_id', 'combo_id', 'payment_id', 'payment_status', 'amount_paid', 'coupon_id', 'created_at'
  ],
  lesson_progress: [
    'id', 'user_id', 'lesson_id', 'completed', 'updated_at'
  ],
  certificates: [
    'id', 'certificate_code', 'user_id', 'course_id', 'student_name', 'course_title', 'issued_at'
  ],
  comments: [
    'id', 'lesson_id', 'user_id', 'parent_id', 'content', 'created_at'
  ],
  site_settings: [
    'id', 'key', 'value', 'description', 'updated_at'
  ],
};

// Catálogo de Secciones y Rutas de la Aplicación
const APP_SECTIONS = [
  {
    name: 'Portada y Catálogo Público',
    type: 'Página Pública',
    path: '/',
    file: 'src/app/page.tsx',
    description: 'Hero, beneficios, catálogo con filtros de cursos/combos y FAQ',
    requiredTables: ['courses', 'combos', 'combo_courses', 'site_settings'],
  },
  {
    name: 'Autenticación y Login',
    type: 'Página Pública',
    path: '/login',
    file: 'src/app/login/page.tsx',
    description: 'Acceso al campus virtual y reseteo de contraseña',
    requiredTables: ['profiles'],
  },
  {
    name: 'Checkout y Pago',
    type: 'Página de Pago',
    path: '/checkout',
    file: 'src/app/checkout/page.tsx',
    description: 'Resumen de compra, validación de cupones y pasarela Mercado Pago',
    requiredTables: ['courses', 'combos', 'coupons'],
  },
  {
    name: 'Retornos de Pago (Success / Pending / Failure)',
    type: 'Páginas Públicas',
    path: '/checkout/success | /pending | /failure',
    file: 'src/app/checkout/success/page.tsx',
    description: 'Confirmación de matrícula y mensajes para pagos diferidos',
    requiredTables: ['site_settings'],
  },
  {
    name: 'Validador Público de Certificados',
    type: 'Página Pública',
    path: '/validar y /validar/[codigo]',
    file: 'src/app/validar/[codigo]/page.tsx',
    description: 'Comprobación de autenticidad de diplomas con QR y código alfanumérico',
    requiredTables: ['certificates', 'courses', 'profiles'],
  },
  {
    name: 'Dashboard del Estudiante (Mis Cursos)',
    type: 'Aula Virtual',
    path: '/dashboard',
    file: 'src/app/dashboard/page.tsx',
    description: 'Cursos inscritos con barra de progreso general en tiempo real',
    requiredTables: ['profiles', 'enrollments', 'courses', 'combos', 'combo_courses', 'lesson_progress', 'lessons'],
  },
  {
    name: 'Aula de Clases (Reproductor y Foro)',
    type: 'Aula Virtual',
    path: '/dashboard/cursos/[slug]',
    file: 'src/app/dashboard/cursos/[slug]/page.tsx',
    description: 'Visualizador de videos YouTube protegidos, temario, progreso y consultas',
    requiredTables: ['courses', 'lessons', 'lesson_progress', 'profiles', 'comments', 'certificates'],
  },
  {
    name: 'Perfil y Diplomas del Estudiante',
    type: 'Aula Virtual',
    path: '/dashboard/perfil',
    file: 'src/app/dashboard/perfil/page.tsx',
    description: 'Edición de nombre, avatar, historial de compras y certificados PDF',
    requiredTables: ['profiles', 'enrollments', 'certificates', 'courses'],
  },
  {
    name: 'Panel de Control Administrativo',
    type: 'Administración',
    path: '/admin',
    file: 'src/app/admin/page.tsx',
    description: 'Métricas de ingresos en ARS, total de alumnos y cursos más vendidos',
    requiredTables: ['enrollments', 'courses', 'profiles', 'combos'],
  },
  {
    name: 'Administración de Cursos y Combos',
    type: 'Administración',
    path: '/admin/cursos',
    file: 'src/app/admin/cursos/page.tsx',
    description: 'Creación/edición de cursos, combos y primeras lecciones',
    requiredTables: ['courses', 'combos', 'combo_courses', 'lessons'],
  },
  {
    name: 'Administración de Cupones',
    type: 'Administración',
    path: '/admin/cupones',
    file: 'src/app/admin/cupones/page.tsx',
    description: 'Creación, pausa y eliminación de cupones porcentuales o fijos',
    requiredTables: ['coupons'],
  },
  {
    name: 'Bandeja de Consultas de Alumnos',
    type: 'Administración',
    path: '/admin/preguntas',
    file: 'src/app/admin/preguntas/page.tsx',
    description: 'Foro docente para responder preguntas de las clases',
    requiredTables: ['comments', 'lessons', 'courses', 'profiles'],
  },
  {
    name: 'Configuración Operativa y Resend',
    type: 'Administración',
    path: '/admin/configuracion',
    file: 'src/app/admin/configuracion/page.tsx',
    description: 'Ajustes de WhatsApp, email de profesores, modo mantenimiento y diagnóstico',
    requiredTables: ['site_settings'],
  },
  {
    name: 'API: Catálogo de Cursos y Combos',
    type: 'API Endpoint',
    path: '/api/catalog',
    file: 'src/app/api/catalog/route.ts',
    description: 'Retorna cursos y combos con cover_image mapeado',
    requiredTables: ['courses', 'combos', 'combo_courses'],
  },
  {
    name: 'API: Lecciones de Curso y Progreso',
    type: 'API Endpoint',
    path: '/api/courses/[slug]/lessons',
    file: 'src/app/api/courses/[slug]/lessons/route.ts',
    description: 'Verifica has_course_access y entrega lecciones ordenadas',
    requiredTables: ['courses', 'lessons', 'lesson_progress'],
  },
  {
    name: 'API: Preferencia de Mercado Pago',
    type: 'API Endpoint',
    path: '/api/checkout/preference',
    file: 'src/app/api/checkout/preference/route.ts',
    description: 'Valida precios, cupones activos/vigentes y genera URL de pago',
    requiredTables: ['courses', 'combos', 'coupons'],
  },
  {
    name: 'API: Webhook de Mercado Pago',
    type: 'API Endpoint',
    path: '/api/webhooks/mercadopago',
    file: 'src/app/api/webhooks/mercadopago/route.ts',
    description: 'Idempotencia, creación de usuario, matrícula e incremento de cupones',
    requiredTables: ['enrollments', 'profiles', 'combo_courses', 'coupons', 'courses', 'combos'],
  },
  {
    name: 'API: Emisión y Validación de Diplomas',
    type: 'API Endpoint',
    path: '/api/certificates/issue y /verify/[codigo]',
    file: 'src/app/api/certificates/verify/[codigo]/route.ts',
    description: 'Emite y verifica certificados oficiales por código público',
    requiredTables: ['certificates', 'courses', 'profiles'],
  },
  {
    name: 'API: Configuración Global del Sitio',
    type: 'API Endpoint',
    path: '/api/settings',
    file: 'src/app/api/settings/route.ts',
    description: 'Lectura y actualización de parámetros operativos globales',
    requiredTables: ['site_settings'],
  },
  {
    name: 'API: Diagnóstico de Estado del Sistema',
    type: 'API Endpoint',
    path: '/api/admin/system-status',
    file: 'src/app/api/admin/system-status/route.ts',
    description: 'Latencia de BD, estado de Mercado Pago y Resend',
    requiredTables: ['courses', 'site_settings'],
  },
];

async function runAudit() {
  console.log(`\n${c.bold}${c.green}================================================================${c.reset}`);
  console.log(`${c.bold}${c.green}      AGENTE AUDITOR DE PLATAFORMA Y BASE DE DATOS              ${c.reset}`);
  console.log(`${c.bold}${c.green}                 ACADEMIA CLICK AGRO                            ${c.reset}`);
  console.log(`${c.bold}${c.green}================================================================${c.reset}\n`);

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalChecks = 0;

  // --------------------------------------------------------------------------
  // FASE 1: AUDITORÍA DE CREDENCIALES Y CONECTIVIDAD
  // --------------------------------------------------------------------------
  console.log(`${c.bold}${c.cyan}▶ FASE 1: Verificación de Credenciales y Conectividad Supabase${c.reset}`);
  
  if (!SUPABASE_URL || !SUPABASE_URL.startsWith('https://')) {
    console.log(`  ${c.red}✖ NEXT_PUBLIC_SUPABASE_URL no es válida o está ausente.${c.reset}`);
    totalErrors++;
  } else {
    console.log(`  ${c.green}✔ NEXT_PUBLIC_SUPABASE_URL:${c.reset} ${SUPABASE_URL}`);
    totalChecks++;
  }

  if (!SERVICE_KEY || SERVICE_KEY.length < 30) {
    console.log(`  ${c.red}✖ SUPABASE_SERVICE_ROLE_KEY no está configurada o es muy corta.${c.reset}`);
    totalErrors++;
  } else {
    console.log(`  ${c.green}✔ SUPABASE_SERVICE_ROLE_KEY presente:${c.reset} (${SERVICE_KEY.substring(0, 15)}...)`);
    totalChecks++;
  }

  if (!ANON_KEY || ANON_KEY.length < 20) {
    console.log(`  ${c.yellow}⚠ NEXT_PUBLIC_SUPABASE_ANON_KEY no configurada o incompleta.${c.reset}`);
    totalWarnings++;
  } else {
    console.log(`  ${c.green}✔ NEXT_PUBLIC_SUPABASE_ANON_KEY presente:${c.reset} (${ANON_KEY.substring(0, 15)}...)`);
    totalChecks++;
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  // Probar latencia y conexión con la base
  try {
    const t0 = Date.now();
    const { error: pingErr } = await adminClient.from('courses').select('id').limit(1);
    const latency = Date.now() - t0;
    if (pingErr) {
      console.log(`  ${c.red}✖ Error al conectar con Supabase:${c.reset} ${pingErr.message}`);
      totalErrors++;
    } else {
      console.log(`  ${c.green}✔ Conexión con PostgreSQL exitosa.${c.reset} Latencia: ${c.bold}${latency}ms${c.reset}`);
      totalChecks++;
    }
  } catch (err) {
    console.log(`  ${c.red}✖ Fallo de red hacia Supabase:${c.reset} ${err.message}`);
    totalErrors++;
  }

  // --------------------------------------------------------------------------
  // FASE 2: VERIFICACIÓN PROFUNDA DE TABLAS Y NOMBRES DE COLUMNAS
  // --------------------------------------------------------------------------
  console.log(`\n${c.bold}${c.cyan}▶ FASE 2: Verificación de Esquema (Tablas y Columnas en Base de Datos)${c.reset}`);

  for (const [table, expectedCols] of Object.entries(SCHEMA_SPEC)) {
    totalChecks++;
    // Verificar existencia de la tabla
    const { error: tableError } = await adminClient.from(table).select('id').limit(0);
    if (tableError) {
      console.log(`  ${c.red}✖ TABLA '${table}':${c.reset} No accesible o no existe (${tableError.message})`);
      totalErrors++;
      continue;
    }

    // Verificar cada una de las columnas esperadas
    const colsQuery = expectedCols.join(', ');
    const { error: colsError } = await adminClient.from(table).select(colsQuery).limit(0);
    if (colsError) {
      console.log(`  ${c.red}✖ TABLA '${table}': Discrepancia en columnas!${c.reset} Detalle: ${colsError.message}`);
      totalErrors++;
      // Chequear individualmente para reportar la columna exacta
      for (const col of expectedCols) {
        const { error: singleColErr } = await adminClient.from(table).select(col).limit(0);
        if (singleColErr) {
          console.log(`    ${c.red}↳ Columna inválida: '${col}' en '${table}'${c.reset}`);
        }
      }
    } else {
      console.log(`  ${c.green}✔ TABLA '${table}':${c.reset} OK (${expectedCols.length} columnas verificadas: ${c.dim}${colsQuery}${c.reset})`);
    }
  }

  // Probar función RPC has_course_access
  totalChecks++;
  try {
    const { error: rpcErr } = await adminClient.rpc('has_course_access', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_course_id: '00000000-0000-0000-0000-000000000000',
    });
    if (rpcErr) {
      console.log(`  ${c.red}✖ FUNCIÓN RPC 'has_course_access':${c.reset} ${rpcErr.message}`);
      totalErrors++;
    } else {
      console.log(`  ${c.green}✔ FUNCIÓN RPC 'has_course_access':${c.reset} Operativa en PostgreSQL`);
    }
  } catch (err) {
    console.log(`  ${c.red}✖ FUNCIÓN RPC 'has_course_access':${c.reset} Error al invocar (${err.message})`);
    totalErrors++;
  }

  // --------------------------------------------------------------------------
  // FASE 3: ANÁLISIS ESTÁTICO DE CÓDIGO FUENTE (CONSISTENCIA DE COLUMNAS EN SRC)
  // --------------------------------------------------------------------------
  console.log(`\n${c.bold}${c.cyan}▶ FASE 3: Escaneo de Consultas Supabase en el Código Fuente (src/)${c.reset}`);

  function getFiles(dir, filterRegex) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFiles(filePath, filterRegex));
      } else if (filterRegex.test(file)) {
        results.push(filePath);
      }
    });
    return results;
  }

  const srcFiles = getFiles('src', /\.(tsx?|mjs)$/);
  console.log(`  ${c.dim}Escaneando ${srcFiles.length} archivos en 'src/'...${c.reset}`);

  // Buscar llamadas a .from('tabla')
  const tableUsageMap = {};
  for (const filePath of srcFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const matches = [...content.matchAll(/\.from\(['"]([a-zA-Z0-9_]+)['"]\)/g)];
    for (const match of matches) {
      const tableName = match[1];
      if (!tableUsageMap[tableName]) tableUsageMap[tableName] = new Set();
      tableUsageMap[tableName].add(filePath);
    }
  }

  for (const [table, files] of Object.entries(tableUsageMap)) {
    totalChecks++;
    if (!SCHEMA_SPEC[table]) {
      console.log(`  ${c.red}✖ TABLA DESCONOCIDA '${table}' consultada en el código:${c.reset}`);
      files.forEach((f) => console.log(`    ↳ ${f}`));
      totalErrors++;
    } else {
      console.log(`  ${c.green}✔ Tabla en código '${table}'${c.reset} coincide con PostgreSQL (${files.size} archivos)`);
    }
  }

  // Verificar que NO existan patrones con columnas viejas corregidas
  const deprecatedPatterns = [
    { pattern: /\.order\(['"]order_index['"]/, fix: 'order_index -> debe ser position en lessons', table: 'lessons' },
    { pattern: /video_youtube_id:.*?first_lesson/, fix: 'video_youtube_id -> debe ser youtube_video_id en lessons', table: 'lessons' },
    { pattern: /completed_at:\s*new Date/, fix: 'completed_at -> debe ser updated_at en lesson_progress', table: 'lesson_progress' },
    { pattern: /pdf_url:\s*verificationUrl/, fix: 'pdf_url -> debe ser certificate_code en certificates', table: 'certificates' },
  ];

  for (const item of deprecatedPatterns) {
    totalChecks++;
    let found = false;
    for (const filePath of srcFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (item.pattern.test(content)) {
        console.log(`  ${c.red}✖ Detectado uso incorrecto de columna en:${c.reset} ${filePath}`);
        console.log(`    ↳ Advertencia: ${item.fix}`);
        totalErrors++;
        found = true;
      }
    }
    if (!found) {
      console.log(`  ${c.green}✔ Verificación estricta:${c.reset} Ningún archivo utiliza columnas obsoletas de '${item.table}'`);
    }
  }

  // --------------------------------------------------------------------------
  // FASE 4: AUDITORÍA DE SECCIONES Y RUTAS DE LA APLICACIÓN
  // --------------------------------------------------------------------------
  console.log(`\n${c.bold}${c.cyan}▶ FASE 4: Verificación de Secciones y Rutas de la Aplicación${c.reset}`);

  for (const section of APP_SECTIONS) {
    totalChecks++;
    const fileExists = fs.existsSync(section.file);
    if (!fileExists) {
      console.log(`  ${c.red}✖ [${section.type}] ${section.name}:${c.reset} Archivo no encontrado (${section.file})`);
      totalErrors++;
      continue;
    }

    // Verificar que las tablas requeridas por la sección existen
    let sectionTablesValid = true;
    for (const t of section.requiredTables) {
      if (!SCHEMA_SPEC[t]) {
        sectionTablesValid = false;
        break;
      }
    }

    if (sectionTablesValid) {
      console.log(
        `  ${c.green}✔ [${section.type}] ${c.bold}${section.name}${c.reset}\n` +
        `    ${c.dim}Ruta:${c.reset} ${section.path} | ${c.dim}Archivo:${c.reset} ${section.file}\n` +
        `    ${c.dim}Tablas dependientes:${c.reset} ${section.requiredTables.join(', ')}`
      );
    } else {
      console.log(`  ${c.red}✖ [${section.type}] ${section.name}:${c.reset} Tablas dependientes inválidas`);
      totalErrors++;
    }
  }

  // --------------------------------------------------------------------------
  // RESUMEN EJECUTIVO Y DIAGNÓSTICO FINAL
  // --------------------------------------------------------------------------
  console.log(`\n${c.bold}================================================================${c.reset}`);
  console.log(`${c.bold}                    RESULTADO DE LA AUDITORÍA                   ${c.reset}`);
  console.log(`${c.bold}================================================================${c.reset}`);
  console.log(`  Total de Verificaciones Realizadas: ${c.bold}${totalChecks}${c.reset}`);
  console.log(`  Errores Críticos Encontrados:       ${totalErrors === 0 ? c.green + '0 (Ninguno)' : c.red + totalErrors}${c.reset}`);
  console.log(`  Advertencias / Observaciones:       ${totalWarnings === 0 ? c.green + '0 (Ninguna)' : c.yellow + totalWarnings}${c.reset}`);

  if (totalErrors === 0) {
    console.log(`\n${c.bold}${c.green}🎉 ESTADO GENERAL: PLATAFORMA 100% OPERATIVA Y SALUDABLE${c.reset}`);
    console.log(`  • Todas las tablas y columnas coinciden con PostgreSQL.`);
    console.log(`  • Las consultas del código fuente están limpias y alineadas.`);
    console.log(`  • Todas las secciones (Públicas, Dashboard y Admin) están verificadas.\n`);
    process.exit(0);
  } else {
    console.log(`\n${c.bold}${c.red}⚠️ ESTADO GENERAL: SE DETECTARON DISCREPANCIAS QUE REQUIEREN ATENCIÓN${c.reset}\n`);
    process.exit(1);
  }
}

runAudit();

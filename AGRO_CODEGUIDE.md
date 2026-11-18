# AGRO_CODEGUIDE - Guía Técnica y Estado de Academia Click Agro

> **Documento de Contexto Maestro y Referencia Técnica**  
> **Plataforma:** Academia Click Agro (EdTech Agrícola)  
> **Última actualización:** Septiembre 2026  
> **Estado de compilación:** 20/20 rutas estáticas y dinámicas validadas (`npm run build` exitoso, 0 errores de tipos).

---

## 1. Visión General del Proyecto

**Academia Click Agro** es una plataforma educativa integral para el sector agropecuario de Argentina y Latinoamérica. Integra pasarela de cobros en pesos argentinos (Mercado Pago), aula virtual protegida con reproductor de video anti-filtraciones, emisión de certificados PDF con verificación criptográfica pública (código QR), panel administrativo privado para directores y profesores, y notificaciones transaccionales automáticas vía correo electrónico (Resend).

### Stack Tecnológico
- **Framework Frontend/Backend:** Next.js 14.2.24 (App Router).
- **Lenguaje:** TypeScript 5.5 (modo estricto).
- **Estilos:** Tailwind CSS 3.4.19 (configurado con PostCSS 8 y Autoprefixer).
- **Iconografía:** Lucide React.
- **Base de Datos & Autenticación:** Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security, Triggers PL/pgSQL).
- **Pasarela de Pagos:** Mercado Pago SDK v2 (Checkout Pro, Preferencias y Webhooks con idempotencia).
- **Emails Transaccionales:** Resend SDK v6.
- **Generación de Certificados:** jsPDF con validación vectorial y QR.

---

## 2. Arquitectura de Base de Datos y Seguridad (Supabase)

La base de datos reside en el proyecto Supabase (`https://kigeuajghtzzzyfkljrs.supabase.co`). Todos los accesos están protegidos mediante **Row Level Security (RLS)** y funciones de seguridad definidas con `SECURITY DEFINER`.

### 2.1 Esquema de Tablas

1. **`profiles`**:
   - `id` (UUID, PK referencia a `auth.users(id)` con `ON DELETE CASCADE`).
   - `email` (TEXT), `full_name` (TEXT), `avatar_url` (TEXT).
   - `role` (TEXT: `'student'`, `'teacher'`, `'admin'`).
   - *Sincronización:* Manejada automáticamente por el trigger `on_auth_user_created` que ejecuta la función `handle_new_user()`.
2. **`courses`**:
   - `id` (UUID, PK), `title` (TEXT), `slug` (TEXT UNIQUE), `description` (TEXT).
   - `price` (NUMERIC 12,2), `cover_image` (TEXT), `is_published` (BOOLEAN).
3. **`modules`**:
   - `id` (UUID, PK), `course_id` (UUID -> `courses.id`), `title` (TEXT), `position` (INT).
4. **`lessons`**:
   - `id` (UUID, PK), `course_id` (UUID -> `courses.id`), `module_id` (UUID -> `modules.id`).
   - `title` (TEXT), `description` (TEXT), `youtube_video_id` (TEXT), `zoom_link` (TEXT).
   - `position` (INT), `is_free_preview` (BOOLEAN).
5. **`lesson_resources`**:
   - `id` (UUID, PK), `lesson_id` (UUID -> `lessons.id`), `title` (TEXT), `file_url` (TEXT).
6. **`combos`**:
   - `id` (UUID, PK), `title` (TEXT), `slug` (TEXT UNIQUE), `description` (TEXT), `price` (NUMERIC), `cover_image` (TEXT), `is_published` (BOOLEAN).
7. **`combo_courses`**:
   - `id` (UUID, PK), `combo_id` (UUID -> `combos.id`), `course_id` (UUID -> `courses.id`), `UNIQUE(combo_id, course_id)`.
8. **`coupons`**:
   - `id` (UUID, PK), `code` (TEXT UNIQUE), `discount_percent` (NUMERIC), `discount_amount` (NUMERIC).
   - `max_uses` (INT), `uses_count` (INT), `valid_until` (TIMESTAMPTZ), `is_active` (BOOLEAN).
9. **`enrollments`**:
   - `id` (UUID, PK), `user_id` (UUID -> `profiles.id`), `course_id` (UUID), `combo_id` (UUID).
   - `payment_id` (TEXT), `payment_status` (TEXT: `'approved'`, `'pending'`, `'rejected'`, `'refunded'`).
   - `amount_paid` (NUMERIC), `coupon_id` (UUID -> `coupons.id`).
10. **`lesson_progress`**:
    - `id` (UUID, PK), `user_id` (UUID -> `profiles.id`), `lesson_id` (UUID -> `lessons.id`).
    - `completed` (BOOLEAN), `UNIQUE(user_id, lesson_id)`.
11. **`certificates`**:
    - `id` (UUID, PK), `certificate_code` (TEXT UNIQUE, ej: `AGRO-2026-XXXX`).
    - `user_id` (UUID -> `profiles.id`), `course_id` (UUID -> `courses.id`).
    - `student_name` (TEXT), `course_title` (TEXT), `issued_at` (TIMESTAMPTZ).
12. **`comments`**:
    - `id` (UUID, PK), `lesson_id` (UUID -> `lessons.id`), `user_id` (UUID -> `profiles.id`).
    - `parent_id` (UUID -> `comments.id` para respuestas anidadas), `content` (TEXT).
13. **`site_settings`**:
    - `id` (UUID, PK), `key` (TEXT UNIQUE), `value` (TEXT), `description` (TEXT), `updated_at` (TIMESTAMPTZ).
    - *RLS:* Lectura pública (anónimos/autenticados) y escritura/actualización exclusiva para rol `'admin'`.

### 2.2 Función RPC Crítica: `has_course_access(p_user_id, p_course_id)`
Valida de forma centralizada en PostgreSQL si un usuario tiene acceso legítimo a un curso:
- Retorna `true` si el rol en `profiles` es `'admin'` o `'teacher'`.
- Retorna `true` si existe una fila en `enrollments` con `payment_status = 'approved'` para ese `course_id` directo o a través de un `combo_id` que contenga dicho curso en `combo_courses`.
- Retorna `false` en cualquier otro caso.

---

## 3. Mapa de Rutas y Endpoints

### 3.1 Vistas Públicas y Estudiantiles
| Ruta | Descripción |
| :--- | :--- |
| `/` | Landing page principal con catálogo dinámico (`/api/catalog`), propuesta de valor, testimonios y FAQs. |
| `/checkout` | Pantalla de pago optimizada para cursos o combos. Validación de cupones en tiempo real y generación de botón de pago MP. |
| `/checkout/success` | Pantalla de confirmación tras pago aprobado con enlace directo al aula virtual. |
| `/checkout/pending` | Pantalla de aviso para pagos en efectivo (Rapipago/Pago Fácil) con instrucciones de acreditación. |
| `/checkout/failure` | Pantalla de pago rechazado con opciones de reintento o contacto por WhatsApp. |
| `/login` | Autenticación con email/contraseña y formulario de recuperación de clave. Envuelto en `<Suspense>`. |
| `/dashboard` | Campus virtual del estudiante con métricas de progreso por curso (% completado) y accesos directos. |
| `/dashboard/cursos/[slug]` | Aula virtual interactiva: reproductor de YouTube protegido, links a clases en vivo de Zoom, descarga de archivos, preguntas y respuestas, y generador de certificado en PDF. |
| `/dashboard/perfil` | Gestión de datos personales, cambio de contraseña segura e historial de compras con identificadores de pago. |
| `/validar` y `/validar/[codigo]` | Validador público de certificados con visualización de estado oficial, nombre del alumno, curso y fecha de expedición. |

### 3.2 Panel de Administración (`/admin`)
Protegido por `src/app/admin/layout.tsx`. Solo permite acceso a usuarios autenticados con rol `'admin'` o `'teacher'`.
- `/admin`: Tablero general con métricas en tiempo real (ingresos totales ARS, alumnos matriculados, cursos más vendidos), últimas transacciones de Mercado Pago y directorio de alumnos con buscador.
- `/admin/cursos`: CRUD completo de cursos, módulos y lecciones (edición de título, precio, portada, YouTube ID y Zoom).
- `/admin/cupones`: Creación y desactivación de cupones de descuento (% o monto fijo, límite de usos).
- `/admin/preguntas`: Bandeja de moderación para responder preguntas de los alumnos en cualquier lección.
- `/admin/configuracion`: Módulo de Configuración Global con 4 pestañas: 1. Contacto & Soporte (WhatsApp con preview interactivo, correos), 2. Integración de Emails Resend (gestión de API Key oculta con eye-toggle, remitente y test en vivo), 3. Negocio & Leyendas (modo mantenimiento y checkout pending) y 4. Estado del Sistema en tiempo real.

### 3.3 Endpoints de API Backend (`/api`)
- `GET /api/settings` & `PUT /api/settings`: Lectura pública de llaves no sensibles y actualización autenticada para rol admin de la tabla `site_settings`.
- `POST /api/admin/resend/test`: Envío de correo de comprobación para validar la API Key y remitente de Resend.
- `GET /api/admin/system-status`: Diagnóstico de salud y conectividad en tiempo real (Supabase, Mercado Pago, Resend, entorno).
- `GET /api/catalog`: Devuelve cursos y combos publicados de forma segura.
- `POST /api/checkout/preference`: Valida cupones (case-insensitive con `ILIKE`, trim de espacios), calcula precio final y crea la preferencia en Mercado Pago con metadata inmutable.
- `POST /api/webhooks/mercadopago`: Receptor de notificaciones de Mercado Pago.
  - Verifica estado con la API oficial de Mercado Pago.
  - Valida idempotencia con `payment_id`.
  - Si el pago es `rejected` o `pending`, **no otorga acceso** ni crea cuentas.
  - Si el pago es `refunded` o `charged_back`, revoca accesos en `enrollments`.
  - Si el pago es `approved`, crea usuario en Auth (si es nuevo), asigna matrícula (o matrículas hijas de combo), incrementa usos de cupón y despacha email de bienvenida con Resend.
  - En entorno de desarrollo (`NODE_ENV !== 'production'`), admite simulación con `_is_simulation: true`.
- `GET /api/courses/[slug]/lessons`: Endpoint protegido por JWT. Valida `has_course_access()` antes de entregar las URLs de video y Zoom.
- `POST /api/certificates/issue`: Emite un nuevo certificado verificando que el progreso del alumno sea del 100%.
- `GET /api/certificates/verify/[codigo]`: Verificación pública de autenticidad de diplomas.
- `POST /api/notifications/question`: Dispara un email al docente asignado cuando un alumno formula una pregunta.

---

## 4. Medidas de Seguridad Implementadas

1. **Protección Anti-Filtración de Videos (`VideoPlayer.tsx`):**
   - El ID de YouTube no se expone en la carga inicial de la página. Se obtiene mediante el endpoint protegido `/api/courses/[slug]/lessons`.
   - Se superpone una capa transparente (`pointer-events-none`) que impide hacer clic derecho, copiar la URL del video o ver el enlace en YouTube, forzando la visualización dentro del campus.
2. **Control de Idempotencia en Pagos:**
   - La tabla `enrollments` almacena el `payment_id` de Mercado Pago. Si Mercado Pago reenvía el webhook, el sistema detecta la existencia del ID y responde inmediatamente con `already_processed: true` sin duplicar transacciones ni enviar múltiples correos.
3. **Manejo Tolerante de Cupones:**
   - Limpieza automática de espacios (`trim()`), conversión a mayúsculas/minúsculas tolerante (`ILIKE`), verificación de fecha de caducidad (`valid_until`) y límite de usos máximos (`max_uses`). El precio final nunca puede ser inferior a 0.
4. **Separación de Credenciales:**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` se utiliza en el frontend con restricciones de RLS.
   - `SUPABASE_SERVICE_ROLE_KEY` se aísla exclusivamente en el backend (`src/lib/supabaseAdmin.ts`) y nunca se exporta al navegador.

---

## 5. Scripts de Utilidad y Mantenimiento

En el archivo `package.json` se encuentran los siguientes comandos personalizados:

```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción (validación de TypeScript y páginas estáticas)
npm run build

# Ejecutar batería de pruebas automatizada del Webhook de Mercado Pago
npm run test:webhook

# Crear o promover un usuario a Administrador o Profesor
npm run create:admin "email@ejemplo.com" "Contraseña123!" "Nombre Apellido" "admin"
```

### Scripts en carpeta `/scripts`:
- [`scripts/test-webhook.mjs`](file:///d:/clickagro/scripts/test-webhook.mjs): Simula pagos rechazados, pendientes, aprobados e idempotencia contra `/api/webhooks/mercadopago`.
- [`scripts/create-admin.mjs`](file:///d:/clickagro/scripts/create-admin.mjs): Crea cuentas con `email_confirm: true` y sincroniza el rol en `public.profiles`.
- [`scripts/verify-supabase.mjs`](file:///d:/clickagro/scripts/verify-supabase.mjs): Valida la conexión y el caché de esquemas con Supabase.

### Archivos SQL en carpeta `/supabase`:
- [`supabase/schema.sql`](file:///d:/clickagro/supabase/schema.sql): Esquema consolidado original.
- [`supabase/1_tables_and_seed.sql`](file:///d:/clickagro/supabase/1_tables_and_seed.sql): Creación de tablas y datos semilla de prueba.
- [`supabase/2_functions_and_security.sql`](file:///d:/clickagro/supabase/2_functions_and_security.sql): Funciones PL/pgSQL, triggers y políticas RLS.

---

## 6. Variables de Entorno Requeridas (`.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://kigeuajghtzzzyfkljrs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_secret_key

# Mercado Pago
MP_ACCESS_TOKEN=tu_access_token_de_mercadopago

# Resend (Emails transaccionales)
RESEND_API_KEY=tu_resend_api_key
RESEND_FROM_EMAIL="Academia Click Agro <notificaciones@clickagro.com.ar>"
ADMIN_ALERT_EMAIL="profesores@clickagro.com.ar"

# URL pública de la aplicación
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 7. Estado Actual y Credenciales Activas de Prueba

- **Base de datos:** Activa y sincronizada en Supabase con RLS habilitado.
- **Curso Semilla:** *"Manejo de Pulverizaciones Agrícolas de Precisión"* (`11111111-1111-1111-1111-111111111111`) con 2 lecciones cargadas y publicado.
- **Cupón Semilla:** `LANZAMIENTO50` (50% de descuento).
- **Usuario Administrador Creado:**
  - **Email:** `admin@clickagro.com.ar`
  - **Contraseña:** `AdminClickAgro2026!`
  - **Rol:** `admin` (acceso a `/admin`).
- **Alumno de Prueba Matriculado:**
  - **Email:** `alumno.simulado.840544@gmail.com`
  - **Matrícula:** Aprobada para el curso de pulverizaciones.

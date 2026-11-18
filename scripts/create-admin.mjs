import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Leer .env.local
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Obtener argumentos por línea de comandos o usar valores por defecto
const args = process.argv.slice(2);
const email = args[0] || 'admin@clickagro.com.ar';
const password = args[1] || 'AdminClickAgro2026!';
const fullName = args[2] || 'Director Click Agro';
const role = args[3] || 'admin'; // 'admin' o 'teacher'

async function createOrPromoteAdmin() {
  console.log('======================================================');
  console.log(`▶ GESTIÓN DE ACCESO ADMINISTRATIVO CLICK AGRO`);
  console.log('======================================================');
  console.log(`Email:     ${email}`);
  console.log(`Nombre:    ${fullName}`);
  console.log(`Rol:       ${role}`);
  console.log('------------------------------------------------------');

  try {
    // 1. Verificar si el usuario ya existe en Supabase Auth
    const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw listErr;

    const existingUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`ℹ El usuario ya existe en Auth (ID: ${userId}).`);
      
      // Actualizar contraseña si se proporcionó una nueva
      if (password) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
          user_metadata: { full_name: fullName, role },
        });
        console.log(`✔ Contraseña actualizada.`);
      }
    } else {
      console.log(`ℹ Creando nueva cuenta de usuario en Supabase Auth...`);
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
      });

      if (createErr) throw createErr;
      userId = newUser.user.id;
      console.log(`✔ Cuenta creada exitosamente en Auth (ID: ${userId}).`);
    }

    // 2. Asegurar el rol 'admin' en la tabla public.profiles
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        role: role,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (profileErr) throw profileErr;

    console.log(`✔ Rol '${role}' asignado con éxito en la tabla public.profiles.`);
    console.log('======================================================');
    console.log(`🎉 USUARIO ADMINISTRADOR LISTO PARA USAR`);
    console.log(`   URL de Login: http://localhost:3000/login`);
    console.log(`   Email:        ${email}`);
    console.log(`   Contraseña:   ${password}`);
    console.log(`   Acceso Panel: http://localhost:3000/admin`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Error al gestionar usuario administrador:', error.message);
  }
}

createOrPromoteAdmin();

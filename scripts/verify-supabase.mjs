import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Leer .env.local manualmente para verificar exactamente lo que hay
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- TEST DE VERIFICACIÓN DE CLAVES SUPABASE ---');
console.log('URL:', url);

async function testKeys() {
  // 1. Probar Service Role Key
  console.log('\n1. Probando SUPABASE_SERVICE_ROLE_KEY...');
  try {
    const adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Probar consultar profiles y listar usuarios
    const { data: users, error: usersErr } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (usersErr) {
      console.error('❌ Error en service_role auth.admin:', usersErr.message);
    } else {
      console.log('✅ SUPABASE_SERVICE_ROLE_KEY FUNCIONA CORRECTAMENTE!');
      console.log(`   Acceso administrativo verificado. Usuarios en sistema: ${users?.users?.length ?? 0}`);
    }

    const { data: profiles, error: profErr } = await adminClient.from('profiles').select('count').limit(1);
    if (profErr) {
      console.error('❌ Error consultando tabla profiles con service_role:', profErr.message);
    } else {
      console.log('✅ Conexión con PostgreSQL (RLS Bypass) verificada con éxito.');
    }
  } catch (err) {
    console.error('❌ Fallo al inicializar adminClient:', err.message);
  }

  // 2. Probar Anon Key
  console.log('\n2. Probando NEXT_PUBLIC_SUPABASE_ANON_KEY...');
  try {
    const anonClient = createClient(url, anonKey);
    const { data, error } = await anonClient.from('courses').select('id, title').limit(1);
    if (error) {
      console.error('❌ Error con NEXT_PUBLIC_SUPABASE_ANON_KEY:', error.message);
    } else {
      console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY FUNCIONA CORRECTAMENTE!');
      console.log(`   Consulta anónima exitosa. Cursos leídos: ${data?.length ?? 0}`);
    }
  } catch (err) {
    console.error('❌ Fallo con anonClient:', err.message);
  }
}

testKeys();

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

console.log('--- TEST DE CONFIGURACIÓN Y MIGRACIÓN SITE_SETTINGS ---');

async function testSettingsMigration() {
  const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('1. Comprobando presencia de tabla public.site_settings...');
  const { data, error } = await adminClient.from('site_settings').select('*');
  
  if (error) {
    console.log('ℹ️  Estado de tabla site_settings:', error.message);
    console.log('   (La aplicación responderá con los seeds por defecto garantizados y mostrará el asistente de migración)');
  } else {
    console.log('✅ Tabla site_settings encontrada. Registros actuales:', data?.length ?? 0);
    console.log(data);
  }

  console.log('\n2. Verificando script de migración SQL generado...');
  if (fs.existsSync('supabase/3_site_settings.sql')) {
    const sqlContent = fs.readFileSync('supabase/3_site_settings.sql', 'utf-8');
    console.log(`✅ Archivo supabase/3_site_settings.sql verificado (${sqlContent.length} bytes).`);
  } else {
    console.error('❌ Archivo de migración no encontrado.');
  }
}

testSettingsMigration();

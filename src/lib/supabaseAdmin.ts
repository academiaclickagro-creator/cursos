import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://kigeuajghtzzzyfkljrs.supabase.co';
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || 'service-role-key-placeholder-for-build';

/**
 * Cliente administrativo de Supabase (Service Role).
 * IMPORTANTE: Utilizar exclusivamente en el backend (Node.js/Next.js API routes).
 * Nunca exponer SUPABASE_SECRET_KEY en el frontend o con NEXT_PUBLIC_.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

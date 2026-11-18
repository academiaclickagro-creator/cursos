import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kigeuajghtzzzyfkljrs.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key-placeholder';

/**
 * Cliente de Supabase para navegación en el lado del cliente (Frontend).
 * Respeta Row Level Security (RLS) automáticamente según la sesión del usuario.
 */
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

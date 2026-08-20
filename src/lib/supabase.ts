import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Using fallback mode.');
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'gradifi-sefaes-auth-session',
    },
  }
);

// Helper to check connection
export async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('institutions').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.warn('⚠️ Supabase connection warning:', error);
    return false;
  }
}

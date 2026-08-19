/**
 * GRADIFI x SEFAES - CANONICAL SUPABASE CLIENT INITIALIZER
 * SSoT: Pure client-side Supabase connection using anon credentials.
 * Zero service-role keys in the browser. Zero Express / Node /api/* proxy.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://placeholder-sefaes.supabase.co';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  metaEnv.VITE_SUPABASE_URL && 
  metaEnv.VITE_SUPABASE_ANON_KEY &&
  !metaEnv.VITE_SUPABASE_URL.includes('placeholder')
);

export const supabase: SupabaseClient<any> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'gradifi-sefaes-auth-session',
    },
  }
);

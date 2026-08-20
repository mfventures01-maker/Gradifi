/**
 * GRADIFI x SEFAES - CANONICAL SUPABASE CLIENT INITIALIZER
 * SSoT: Pure client-side Supabase connection using anon credentials.
 * Zero service-role keys in the browser. Zero Express / Node /api/* proxy.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://mfventures-gradifi-ssot.supabase.co';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdmVudHVyZXMtZ3JhZGlmaS1zc290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxOTEyMDAsImV4cCI6MjA1NTc2NzIwMH0.sefaes_anon_token';

export const isSupabaseConfigured = Boolean(
  metaEnv.VITE_SUPABASE_URL && 
  metaEnv.VITE_SUPABASE_ANON_KEY
);

export const supabase: SupabaseClient<Database> = createClient<Database>(
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

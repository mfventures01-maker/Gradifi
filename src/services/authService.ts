/**
 * GRADIFI x SEFAES - AUTHENTICATION & IDENTITY SERVICE
 * SSoT: Supabase Auth, profiles, and identity_actors.
 * Zero custom local auth, zero fake tokens, zero client-side role forgery.
 */

import { supabase } from '../lib/supabase';
import { Profile, IdentityActor } from '../contracts/schema';

export interface AuthSessionState {
  isAuthenticated: boolean;
  userId: string | null;
  profile: Profile | null;
  actor: IdentityActor | null;
  institutionId: string | null;
  schoolId: string | null;
  role: string | null;
  actorType: string | null;
}

export const authService = {
  /**
   * Get current Supabase session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Resolve profile and identity actor for the authenticated user
   */
  async resolveCurrentIdentity(): Promise<AuthSessionState> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        isAuthenticated: false,
        userId: null,
        profile: null,
        actor: null,
        institutionId: null,
        schoolId: null,
        role: null,
        actorType: null,
      };
    }

    // 1. Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 2. Fetch Identity Actor (authoritative scoping)
    const { data: actor, error: actorError } = await supabase
      .from('identity_actors')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (actorError) throw actorError;

    const p = profile as any;
    const a = actor as any;
    const institutionId = a?.institution_id || p?.institution_id || null;
    const schoolId = a?.school_id || null;
    const actorType = a?.actor_type || null;
    const role = (actorType || p?.role || null) as AuthSessionState['role'];

    return {
      isAuthenticated: true,
      userId: user.id,
      profile: profile || null,
      actor: actor || null,
      institutionId,
      schoolId,
      role,
      actorType,
    };
  },

  /**
   * Standard Email/Password login
   */
  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * PIN-based quick authentication via verified SEFAES RPC auth_pin_login
   */
  async signInWithPin(pin: string, institutionSlug?: string) {
    const { data, error } = await supabase.rpc('auth_pin_login', {
      pin,
      institution_slug: institutionSlug,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Edge Function Bridge: Exchanges PIN & identifier for an authentic Supabase session
   */
  async exchangePinForSession(pin: string, identifier?: string) {
    const { data, error } = await supabase.functions.invoke('pin-login', {
      body: { pin, identifier: identifier || '' },
    });

    if (error) throw error;
    if (!data?.success) {
      throw new Error(data?.error || 'PIN authentication was not accepted.');
    }
    if (!data.access_token || !data.refresh_token) {
      throw new Error('PIN login did not return a valid Supabase session. Direct-RPC token fallback is disabled.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (sessionError) throw sessionError;
    if (!sessionData.session?.user) {
      throw new Error('Supabase did not establish an authenticated user session.');
    }
    return { ...data, success: true };

  },

  /**
   * Sign out current user session
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

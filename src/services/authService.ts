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
  role: 'admin' | 'principal_admin' | 'vice_principal' | 'bursar' | 'teacher' | 'student' | 'parent' | null;
}

export const authService = {
  /**
   * Get current Supabase session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Alias for signInWithPassword
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
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
   * Sign out current user session
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
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
      };
    }

    // 1. Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 2. Fetch the authoritative identity actor by its Supabase Auth UID.
    const { data: actor } = await supabase
      .from('identity_actors')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const institutionId = actor?.institution_id || profile?.institution_id || null;
    const schoolId = actor?.school_id || null;
    const role = (actor?.actor_type || profile?.role || null) as AuthSessionState['role'];

    return {
      isAuthenticated: true,
      userId: user.id,
      profile: profile || null,
      actor: actor || null,
      institutionId,
      schoolId,
      role,
    };
  },

  /**
   * PIN login is exchanged for a real Supabase Auth session by the trusted Edge Function.
   * The database verifies the generated login ID + PIN; the browser never fabricates tokens.
   */
  async signInWithPhoneAndPin(loginId: string, pin: string) {
    return this.exchangePinForSession(pin, loginId);
  },

  async signInWithPin(pin: string, loginId: string) {
    return this.exchangePinForSession(pin, loginId);
  },

  async exchangePinForSession(pin: string, identifier?: string) {
    const { data, error } = await supabase.functions.invoke("actor-onboarding", {
      body: { action: "login", login_id: identifier || "", pin },
    });
    if (error) throw error;
    if (!data?.success || !data?.token_hash) {
      throw new Error(data?.error || "Invalid login ID or PIN");
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: "magiclink",
    });
    if (sessionError) throw sessionError;
    if (!sessionData.session) throw new Error("Supabase did not establish an authenticated session");
    return {
      success: true,
      session: sessionData.session,
      user: sessionData.user,
      pinRequiresChange: data.pin_requires_change === true,
      role: data.role,
    };
  },

  async setPin(newPin: string) {
    if (!/^\\d{4}$|^\\d{6}$/.test(newPin)) throw new Error("PIN must contain 4 or 6 digits");
    const { data, error } = await supabase.rpc("set_pin", {
      p_new_pin: newPin,
    } as any);
    if (error) throw error;
    return data;
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

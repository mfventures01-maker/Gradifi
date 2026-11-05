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
  role: 'admin' | 'principal' | 'teacher' | 'student' | 'parent' | 'vice_principal' | 'bursar' | null;
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

    // 2. Fetch Identity Actor (authoritative scoping)
    let { data: actor, error: actorError } = await supabase
      .from('identity_actors')
      .select('*')
      .eq('auth_user_id' as any, user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (actorError) {
      const { data: fallbackActor } = await supabase
        .from('identity_actors')
        .select('*')
        .eq('user_id' as any, user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (fallbackActor) actor = fallbackActor;
    }

    const institutionId = actor?.institution_id || profile?.institution_id || null;
    const schoolId = actor?.school_id || null;
    const actorType = actor?.actor_type || actor?.role || null;\n    const role = (actorType === 'principal_admin' ? 'principal' : actorType || profile?.role || null) as AuthSessionState['role'];

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
   * Generate 6-digit PIN for new users
   * Called when Principal creates VP, Bursar, or Teacher
   */
  generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  /**
   * Authenticate user with phone + 6-digit PIN
   * For: VP, Bursar, Teacher roles
   */
  async signInWithPhoneAndPin(phone: string, pin: string) {
    const { data, error } = await supabase.rpc('auth_pin_login', {
      p_identifier: phone,
      p_pin: pin,
    });
    if (error) throw error;
    if (!data || data.success !== true) {
      throw new Error(data?.error || 'Invalid phone number or PIN.');
    }
    return data;
  },


/**
 * GRADIFI x SEFAES - AUTHENTICATION & IDENTITY SERVICE
 * SSoT: Supabase Auth, profiles, and identity_actors.
 * Zero custom local auth, zero fake tokens, zero client-side role forgery.
 */

import { supabase } from '../lib/supabase';
import { Profile, IdentityActor } from '../contracts/schema';
import { identityProvisioningService } from './identityProvisioningService';

export interface AuthSessionState {
  isAuthenticated: boolean;
  userId: string | null;
  profile: Profile | null;
  actor: IdentityActor | null;
  institutionId: string | null;
  schoolId: string | null;
  role: 'admin' | 'principal' | 'teacher' | 'student' | 'parent' | null;
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
    const role = (actor?.role || profile?.role || null) as AuthSessionState['role'];

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
   * PIN authentication uses the trusted Edge Function and then exchanges
   * its one-time token hash through Supabase Auth. No direct RPC fallback.
   */
  async signInWithPhoneAndPin(staffId: string, pin: string) {
    return identityProvisioningService.loginWithPin({ identifier: staffId, pin });
  },

  async signInWithPin(identifier: string, pin: string) {
    return identityProvisioningService.loginWithPin({ identifier, pin });
  },

  async exchangePinForSession(pin: string, identifier: string) {
    return identityProvisioningService.loginWithPin({ identifier, pin });
  },

  async setPin(_userId: string, newPin: string, _forceChange = false) {
    return identityProvisioningService.changePin(newPin);
  },

  async resetPin(userId: string, _resetBy: string) {
    const { data, error } = await supabase.functions.invoke('reset-pin', {
      body: { user_id: userId },
    });
    if (error) throw new Error(error.message || 'PIN reset failed.');
    if (!data?.success || !data?.login_identifier || !data?.temporary_pin) {
      throw new Error('PIN reset was not confirmed by the trusted gateway.');
    }
    return data;
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

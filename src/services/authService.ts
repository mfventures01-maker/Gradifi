/** 
 * GRADIFI x SEFAES - AUTHENTICATION & IDENTITY SERVICE
 * SSoT: Supabase Auth, profiles, and identity_actors.
 * Zero custom local auth, zero fake tokens, zero client-side role forgery.
 */

import { supabase } from '../lib/supabase';
import { Profile, IdentityActor } from '../contracts/schema';

type SafeAuthProfile = Pick<Profile,
  'id' | 'user_id' | 'institution_id' | 'school_id' | 'full_name' |
  'role' | 'email' | 'phone' | 'account_type' | 'authority_user_id' | 'created_at'
>;

export interface AuthSessionState {
  isAuthenticated: boolean;
  userId: string | null;
  profile: SafeAuthProfile | null;
  actor: IdentityActor | null;
  institutionId: string | null;
  schoolId: string | null;
  role: 'admin' | 'superadmin' | 'principal_admin' | 'vice_principal' | 'bursar' | 'teacher' | 'student' | 'parent' | 'dean' | 'hod' | 'adviser' | 'lecturer' | 'vice_chancellor' | 'rector' | 'individual' | null;
}

export const authService = {
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  /**
   * Resolve the current identity without selecting credential hashes or lockout
   * counters. The database exposes only this non-secret actor projection to clients.
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

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id,user_id,institution_id,school_id,full_name,role,email,phone,account_type,authority_user_id,created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    const profile = profileData as SafeAuthProfile | null;

    const { data: actorData, error: actorError } = await supabase
      .from('identity_actors')
      .select('id,auth_user_id,institution_id,school_id,actor_type,actor_record_id,login_identifier,auth_method,status,pin_changed_at,authority_user_id,created_at,updated_at,last_login_at')
      .eq('auth_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (actorError) {
      throw actorError;
    }

    // The query intentionally omits pin_hash, failed_attempts and locked_until.
    const actor = actorData as unknown as IdentityActor | null;
    const institutionId = actor?.institution_id || profile?.institution_id || null;
    const schoolId = actor?.school_id || null;
    const role = (actor?.actor_type || profile?.role || null) as AuthSessionState['role'];

    return {
      isAuthenticated: true,
      userId: user.id,
      profile: profile || null,
      actor,
      institutionId,
      schoolId,
      role,
    };
  },

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
    if (!/^\d{4}$|^\d{6}$/.test(newPin)) throw new Error("PIN must contain 4 or 6 digits");
    const { data, error } = await supabase.rpc("set_pin", {
      p_new_pin: newPin,
    } as any);
    if (error) throw error;
    return data;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

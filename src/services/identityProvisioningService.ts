import { supabase } from '../lib/supabase';
import {
  BulkProvisionStudentsRequest,
  BulkProvisionStudentsResponse,
  PinLoginRequest,
  ProvisionIdentityRequest,
  ProvisionIdentityResponse,
  isPinLoginResponse,
  isProvisionIdentityResponse,
} from '../contracts/identityProvisioning';

function assertConfigured(): void {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('placeholder')) {
    throw new Error('Supabase is not configured. Identity operations are disabled.');
  }
}

export const identityProvisioningService = {
  async provision(input: ProvisionIdentityRequest): Promise<ProvisionIdentityResponse> {
    assertConfigured();
    const { data, error } = await supabase.functions.invoke('provision-identity', {
      body: input,
    });
    if (error) throw new Error(error.message || 'Identity provisioning failed.');
    if (!isProvisionIdentityResponse(data)) {
      throw new Error('Provisioning gateway returned an invalid response. No success was assumed.');
    }
    return data;
  },

  async bulkProvisionStudents(
    input: BulkProvisionStudentsRequest,
  ): Promise<BulkProvisionStudentsResponse> {
    assertConfigured();
    const { data, error } = await supabase.functions.invoke('provision-identities-bulk', {
      body: input,
    });
    if (error) throw new Error(error.message || 'Bulk student provisioning failed.');
    if (!data || typeof data !== 'object'
      || !Array.isArray(data.results)
      || data.total_submitted !== input.students.length
      || data.success_count + data.failed_count !== data.total_submitted) {
      throw new Error('Bulk provisioning gateway returned an invalid or incomplete result.');
    }
    return data as BulkProvisionStudentsResponse;
  },

  async loginWithPin(input: PinLoginRequest) {
    assertConfigured();
    const { data, error } = await supabase.functions.invoke('pin-login', {
      body: input,
    });
    if (error) throw new Error(error.message || 'Invalid login credentials.');
    if (!isPinLoginResponse(data)) {
      throw new Error('PIN login did not return a valid one-time Auth exchange.');
    }

    // The gateway verifies the PIN and returns a one-time Auth token hash.
    // Supabase Auth, not the gateway response, creates the browser session.
    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: 'magiclink',
    });
    if (sessionError || !sessionData.session) {
      throw new Error(sessionError?.message || 'Supabase did not establish an authenticated session.');
    }
    return {
      session: sessionData.session,
      user: sessionData.user,
      requiresPinChange: data.requires_pin_change,
    };
  },

  async changePin(newPin: string) {
    assertConfigured();
    if (!/^\d{4}$|^\d{6}$/.test(newPin)) {
      throw new Error('PIN must contain exactly four or six digits.');
    }
    const { data, error } = await supabase.functions.invoke('change-pin', {
      body: { new_pin: newPin },
    });
    if (error) throw new Error(error.message || 'PIN update failed.');
    if (!data?.success) throw new Error('PIN update was not confirmed by the server.');
    return data;
  },
};

import { supabase } from '../lib/supabase';

export interface CbtPaymentInitialization {
  success: boolean;
  free?: boolean;
  already_entitled?: boolean;
  exam_id?: string;
  order_id?: string;
  reference?: string;
  authorization_url?: string;
  access_code?: string;
}

export const cbtPaymentService = {
  async initialize(offerId: string): Promise<CbtPaymentInitialization> {
    const { data, error } = await supabase.functions.invoke('cbt-payments', {
      body: { action: 'initialize', offer_id: offerId },
    });
    if (error) throw new Error(error.message || 'Unable to initialize checkout');
    if (!data?.success) throw new Error(data?.error || 'Checkout initialization was not confirmed');
    return data as CbtPaymentInitialization;
  },

  async verify(reference: string): Promise<{ success: boolean; exam_id: string; order_id: string }> {
    const { data, error } = await supabase.functions.invoke('cbt-payments', {
      body: { action: 'verify', reference },
    });
    if (error) throw new Error(error.message || 'Unable to verify payment');
    if (!data?.success || !data.exam_id) throw new Error(data?.error || 'Payment verification was not confirmed');
    return data;
  },
};

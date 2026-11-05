import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_URL') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const response = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error('Missing server configuration: ' + name);
  return value;
};

const serviceClient = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const verifyPaystack = async (reference: string) => {
  const result = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), {
    headers: { Authorization: 'Bearer ' + env('PAYSTACK_SECRET_KEY'), Accept: 'application/json' },
  });
  const payload = await result.json();
  if (!result.ok || payload.status !== true || !payload.data) {
    throw new Error(payload.message || 'Paystack verification request failed');
  }
  return payload.data;
};

const hmacSha512 = async (secret: string, body: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature)).map(value => value.toString(16).padStart(2, '0')).join('');
};

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index++) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
};

const confirmVerifiedPayment = async (reference: string) => {
  const payment = await verifyPaystack(reference);
  if (payment.status !== 'success') throw new Error('Payment has not succeeded at the provider');
  if (String(payment.reference) !== reference) throw new Error('Payment reference mismatch');
  const { data, error } = await serviceClient().rpc('cbt_public_confirm_payment', {
    p_reference: reference,
    p_transaction_id: String(payment.id),
    p_amount_minor: Number(payment.amount),
    p_currency: String(payment.currency || '').toUpperCase(),
    p_provider_payload: payment,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
};

const getAuthenticatedUser = async (authorization: string | null) => {
  if (!authorization?.startsWith('Bearer ')) throw new Error('Authentication required');
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Invalid or expired candidate session');
  if (!data.user.email_confirmed_at) throw new Error('Confirm your email before purchasing an examination');
  return { client, user: data.user };
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response(405, { success: false, error: 'Method not allowed' });

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    const authorization = request.headers.get('authorization');
    const isWebhook = Boolean(signature);

    if (isWebhook) {
      const expected = await hmacSha512(env('PAYSTACK_SECRET_KEY'), rawBody);
      if (!constantTimeEqual(signature!.toLowerCase(), expected.toLowerCase())) {
        return response(401, { success: false, error: 'Invalid payment webhook signature' });
      }
      const event = JSON.parse(rawBody);
      const reference = String(event?.data?.reference || '');
      if (!reference) return response(400, { success: false, error: 'Webhook reference is missing' });

      if (event.event === 'charge.success') {
        const confirmed = await confirmVerifiedPayment(reference);
        return response(200, { success: true, event: event.event, result: confirmed });
      }
      if (event.event === 'charge.failed') {
        const { error } = await serviceClient().rpc('cbt_public_mark_payment_failed', {
          p_reference: reference,
          p_reason: 'Payment provider reported charge.failed',
        });
        if (error) throw error;
      }
      return response(200, { success: true, ignored: true, event: event.event || 'unknown' });
    }

    const body = JSON.parse(rawBody);
    const { client, user } = await getAuthenticatedUser(authorization);

    if (body.action === 'initialize') {
      const offerId = String(body.offer_id || '');
      if (!offerId) return response(400, { success: false, error: 'offer_id is required' });

      const { data: order, error: orderError } = await client.rpc('cbt_public_create_order', {
        p_offer_id: offerId,
      });
      if (orderError) throw orderError;
      if (order?.already_entitled || order?.free) {
        return response(200, { success: true, free: Boolean(order.free), already_entitled: Boolean(order.already_entitled), exam_id: order.exam_id });
      }
      if (order?.authorization_url) {
        return response(200, {
          success: true, order_id: order.order_id, exam_id: order.exam_id,
          reference: order.provider_reference, authorization_url: order.authorization_url,
          access_code: order.access_code,
        });
      }

      const callbackUrl = env('APP_URL').replace(/\/$/, '') + '/cbt/public/payment-return';
      const initResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + env('PAYSTACK_SECRET_KEY'),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: order.amount_minor,
          currency: order.currency,
          reference: order.provider_reference,
          callback_url: callbackUrl,
          metadata: { order_id: order.order_id, exam_id: order.exam_id, channel: 'public_cbt' },
        }),
      });
      const initialized = await initResponse.json();
      if (!initResponse.ok || initialized.status !== true || !initialized.data?.authorization_url) {
        await serviceClient().rpc('cbt_public_mark_payment_failed', {
          p_reference: order.provider_reference,
          p_reason: initialized.message || 'Paystack checkout initialization failed',
        });
        throw new Error(initialized.message || 'Unable to initialize Paystack checkout');
      }
      const { error: checkoutSaveError } = await serviceClient().rpc('cbt_public_set_checkout', {
        p_reference: order.provider_reference,
        p_authorization_url: initialized.data.authorization_url,
        p_access_code: initialized.data.access_code || null,
      });
      if (checkoutSaveError) throw checkoutSaveError;
      return response(200, {
        success: true,
        order_id: order.order_id,
        exam_id: order.exam_id,
        reference: order.provider_reference,
        authorization_url: initialized.data.authorization_url,
        access_code: initialized.data.access_code,
      });
    }

    if (body.action === 'verify') {
      const reference = String(body.reference || '');
      if (!reference) return response(400, { success: false, error: 'reference is required' });
      const { data: order, error: orderError } = await client.from('cbt_public_orders')
        .select('id,user_id,provider_reference,status,exam_id')
        .eq('provider_reference', reference)
        .eq('user_id', user.id)
        .maybeSingle();
      if (orderError || !order) return response(404, { success: false, error: 'Candidate payment order not found' });
      const result = await confirmVerifiedPayment(reference);
      return response(200, { success: true, exam_id: order.exam_id, order_id: order.id, result });
    }

    return response(400, { success: false, error: 'Unsupported payment action' });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Payment operation failed';
    return response(400, { success: false, error: message });
  }
});

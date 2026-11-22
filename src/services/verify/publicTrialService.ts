import { supabase } from '../../lib/supabase.js';

const SESSION_KEY = 'gradifi.public-trial.v1';

interface StoredTrialSession {
  trialToken: string;
  checksRemaining: number;
  expiresAt: string;
}

export type PublicTrialRequest =
  | { mode: 'verify'; documentText: string }
  | { mode: 'compare'; studentText: string; sourceText: string };

export interface PublicTrialExecution<T = unknown> {
  result: T;
  checksRemaining: number;
}

function readStoredSession(): StoredTrialSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as StoredTrialSession;
    if (
      typeof value.trialToken !== 'string' ||
      value.trialToken.length < 40 ||
      !Number.isInteger(value.checksRemaining) ||
      typeof value.expiresAt !== 'string' ||
      Date.parse(value.expiresAt) <= Date.now()
    ) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return value;
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function writeStoredSession(session: StoredTrialSession): void {
  if (typeof window === 'undefined') throw new Error('Public trial requires a browser session.');
  if (session.checksRemaining <= 0) {
    window.sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function getOrStartTrialSession(): Promise<StoredTrialSession> {
  const existing = readStoredSession();
  if (existing) return existing;

  const { data, error } = await supabase.functions.invoke('trial', {
    body: { action: 'start' },
  });

  if (error || !data?.success || typeof data.trialToken !== 'string' || typeof data.expiresAt !== 'string') {
    const code = typeof data?.code === 'string' ? data.code : 'TRIAL_START_FAILED';
    throw new Error(
      code === 'TRIAL_START_RATE_LIMITED'
        ? 'The free-trial start limit has been reached for this network. Please try again later.'
        : 'A public trial session could not be started. Please try again.'
    );
  }

  const session: StoredTrialSession = {
    trialToken: data.trialToken,
    checksRemaining: Number.isInteger(data.checksRemaining) ? data.checksRemaining : 3,
    expiresAt: data.expiresAt,
  };
  writeStoredSession(session);
  return session;
}

/**
 * Runs the public verification operation through the server-side trial gate.
 * The opaque token is consumed by the server before G5 execution; it is never
 * sent to browser storage other than sessionStorage and is never logged.
 */
export async function executePublicTrialVerification<T = unknown>(
  request: PublicTrialRequest
): Promise<PublicTrialExecution<T>> {
  const session = await getOrStartTrialSession();

  const response = await fetch('/api/verify/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ ...request, trialToken: session.trialToken }),
  });

  const payload = await response.json().catch(() => ({} as Record<string, unknown>));
  const checksRemaining = Number.isInteger(payload.checksRemaining)
    ? Number(payload.checksRemaining)
    : session.checksRemaining;

  if (typeof payload.code === 'string' && payload.code === 'TRIAL_EXHAUSTED_OR_EXPIRED') {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(SESSION_KEY);
  } else {
    writeStoredSession({ ...session, checksRemaining });
  }

  if (!response.ok || payload.success !== true || !('result' in payload)) {
    const code = typeof payload.code === 'string' ? payload.code : 'PUBLIC_TRIAL_VERIFICATION_FAILED';
    const message = typeof payload.message === 'string'
      ? payload.message
      : code === 'TRIAL_EXHAUSTED_OR_EXPIRED'
        ? 'Your free-trial checks have been used or the trial session has expired.'
        : 'The public trial verification could not be completed.';
    throw new Error(message);
  }

  return { result: payload.result as T, checksRemaining };
}

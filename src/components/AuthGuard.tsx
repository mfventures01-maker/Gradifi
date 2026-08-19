import React, { useState, useEffect } from 'react';
import { authService, AuthSessionState } from '../services/authService';
import { Shield, KeyRound, Lock, AlertCircle, ArrowRight } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'principal' | 'teacher' | 'student' | 'parent'>;
  fallback?: React.ReactNode;
  onSessionResolved?: (session: AuthSessionState) => void;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  allowedRoles,
  fallback,
  onSessionResolved,
}) => {
  const [sessionState, setSessionState] = useState<AuthSessionState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'pin' | 'email'>('pin');
  const [pin, setPin] = useState<string>('');
  const [identifier, setIdentifier] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    checkIdentity();
  }, []);

  async function checkIdentity() {
    try {
      setLoading(true);
      const identity = await authService.resolveCurrentIdentity();
      setSessionState(identity);
      if (onSessionResolved) onSessionResolved(identity);
    } finally {
      setLoading(false);
    }
  }

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmitting(true);
    try {
      const result = await authService.exchangePinForSession(pin, identifier);
      if (!result.success) throw new Error('PIN authentication failed.');
      await checkIdentity();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs">Verifying Session...</div>;

  const isRoleAuthorized = !allowedRoles || (sessionState?.role && allowedRoles.includes(sessionState.role));
  if (sessionState?.isAuthenticated && isRoleAuthorized) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl border border-slate-200">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">SEFAES Portal Access</h2>
      </div>
      {authError && <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl">{authError}</div>}
      <form onSubmit={handlePinLogin} className="space-y-4">
        <input required placeholder="Terminal PIN" type="password" maxLength={8} value={pin} onChange={e => setPin(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-center text-lg font-mono" />
        <button type="submit" disabled={submitting} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold cursor-pointer">
          {submitting ? 'Connecting...' : 'Connect with PIN Bridge'}
        </button>
      </form>
    </div>
  );
};

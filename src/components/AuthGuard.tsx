import React, { useState, useEffect } from 'react';
import { authService, AuthSessionState } from '../services/authService';
import { 
  Shield, 
  Lock, 
  KeyRound, 
  AlertCircle, 
  Building2, 
  ArrowRight, 
  UserCheck,
  Sparkles
} from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'principal' | 'teacher' | 'student' | 'parent' | 'bursar' | 'vp'>;
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

  // PIN Login Form State
  const [pin, setPin] = useState<string>('');
  const [identifier, setIdentifier] = useState<string>('');
  const [submittingPin, setSubmittingPin] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Email Login Form State
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submittingEmail, setSubmittingEmail] = useState<boolean>(false);

  useEffect(() => {
    checkIdentity();

    const { data: authListener } = authService.onAuthStateChange(() => {
      checkIdentity();
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  async function checkIdentity() {
    try {
      setLoading(true);
      const identity = await authService.resolveCurrentIdentity();
      setSessionState(identity);
      if (onSessionResolved) {
        onSessionResolved(identity);
      }
    } catch (err) {
      console.warn('Auth identity resolution check:', err);
    } finally {
      setLoading(false);
    }
  }

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmittingPin(true);

    try {
      if (!pin.trim()) throw new Error('Please enter your 4 or 6-digit access PIN.');

      const result = await authService.exchangePinForSession(pin, identifier);

      if (!result.success) {
        throw new Error('PIN authentication failed. Please check your credentials.');
      }

      await checkIdentity();
    } catch (err: any) {
      console.error('PIN Login failed:', err);
      setAuthError(err.message || 'Authentication failed. Please verify your PIN.');
    } finally {
      setSubmittingPin(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmittingEmail(true);

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error('Please enter your email address and password.');
      }

      await authService.signInWithPassword(email, password);
      await checkIdentity();
    } catch (err: any) {
      console.error('Email Login failed:', err);
      setAuthError(err.message || 'Invalid email or password.');
    } finally {
      setSubmittingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Resolving Supabase Security Session...
          </p>
        </div>
      </div>
    );
  }

  // If authenticated and role matches
  const isRoleAuthorized = !allowedRoles || (sessionState?.role && allowedRoles.includes(sessionState.role));

  if (sessionState?.isAuthenticated && isRoleAuthorized) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="min-h-[500px] max-w-md mx-auto my-12 p-6 md:p-8 bg-white rounded-3xl shadow-xl border border-slate-200">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-100 shadow-sm">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">SEFAES Portal Access</h2>
        <p className="text-xs text-slate-500 mt-1">
          Authenticate with your secure PIN terminal code or Administrator Email.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl mb-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => { setAuthMode('pin'); setAuthError(null); }}
          className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            authMode === 'pin' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>PIN Bridge</span>
        </button>
        <button
          type="button"
          onClick={() => { setAuthMode('email'); setAuthError(null); }}
          className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            authMode === 'email' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Email & Password</span>
        </button>
      </div>

      {authError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{authError}</span>
        </div>
      )}

      {authMode === 'pin' ? (
        <form onSubmit={handlePinLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institution Code / Slug (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Building2 className="w-4 h-4" />
              </div>
              <input
                id="input-pin-identifier"
                type="text"
                placeholder="e.g. st-gregory"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Terminal PIN <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="input-terminal-pin"
                type="password"
                maxLength={8}
                required
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono tracking-widest text-center text-lg"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Demo PINs: <span className="font-mono text-slate-600">8942</span> (Principal), <span className="font-mono text-slate-600">1234</span> (Teacher), <span className="font-mono text-slate-600">0000</span> (Student)
            </p>
          </div>

          <button
            id="btn-submit-pin-auth"
            type="submit"
            disabled={submittingPin}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer mt-2 text-sm"
          >
            {submittingPin ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Connect with PIN Bridge</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-auth-email"
              type="email"
              required
              placeholder="admin@school.edu.ng"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-auth-password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <button
            id="btn-submit-email-auth"
            type="submit"
            disabled={submittingEmail}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer mt-2 text-sm"
          >
            {submittingEmail ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In with Password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1 text-[11px] text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
        <span>Supabase Row Level Security (RLS) Enforced</span>
      </div>
    </div>
  );
};

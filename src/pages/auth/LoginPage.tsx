import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, KeyRound, ArrowRight, Shield, AlertCircle, User } from 'lucide-react';
import { authService } from '../../services/authService';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState<'email' | 'pin'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginId, setLoginId] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pendingRole, setPendingRole] = useState<string>('');
  const [requiresPinChange, setRequiresPinChange] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authService.signInWithPassword) {
        await authService.signInWithPassword(email, password);
      } else if (authService.signIn) {
        await authService.signIn(email, password);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      navigate('/portal/principal');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const navigateByRole = (role: string) => {
    if (role === 'vice_principal' || role === 'vp') navigate('/portal/vp');
    else if (role === 'bursar') navigate('/portal/bursar');
    else if (role === 'student') navigate('/portal/student');
    else if (role === 'parent') navigate('/portal/parent');
    else if (role === 'teacher') navigate('/portal/teacher');
    else navigate('/portal/principal');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      if (!/^\d{4}$|^\d{6}$/.test(pin)) throw new Error('Enter the 4-digit or 6-digit PIN issued during onboarding.');
      const res = await authService.signInWithPhoneAndPin(loginId, pin);
      const role = res.role || 'student'; setPendingRole(role);
      if (res.pinRequiresChange) setRequiresPinChange(true); else navigateByRole(role);
    } catch (err: any) { setError(err.message || 'Invalid Login ID or PIN'); }
    finally { setLoading(false); }
  };

  const handleFirstPinChange = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const expectedLength = ['student', 'parent'].includes(pendingRole) ? 4 : 6;
      if (newPin.length !== expectedLength || !/^\d+$/.test(newPin)) throw new Error('Choose a new ' + expectedLength + '-digit PIN.');
      await authService.setPin(newPin); setRequiresPinChange(false); navigateByRole(pendingRole);
    } catch (err: any) { setError(err.message || 'PIN change failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 text-xs text-blue-700 font-medium mb-3">
            <Shield className="w-3.5 h-3.5" />
            SEFAES Compliant
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your Gradifi account</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setAuthMethod('email'); setError(null); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              authMethod === 'email' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Email & Password
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('pin'); setError(null); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              authMethod === 'pin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Login ID + PIN
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {requiresPinChange ? (
          <form onSubmit={handleFirstPinChange} className="space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">First login: create a private PIN before continuing.</div>
            <label className="block text-xs font-medium text-slate-700">New {['student','parent'].includes(pendingRole) ? '4' : '6'}-digit PIN</label>
            <input type="password" inputMode="numeric" maxLength={['student','parent'].includes(pendingRole) ? 4 : 6} value={newPin} onChange={e => setNewPin(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-xl font-mono tracking-widest" required />
            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl disabled:opacity-50">{loading ? 'Updating PIN...' : 'Save PIN and Continue'}</button>
          </form>
        ) : authMethod === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="principal@school.edu.ng"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="rounded border-slate-300" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                System-Generated Login ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value.toUpperCase())}
                  placeholder="TCH-00000001"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                4-digit Student/Parent or 6-digit Staff PIN
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono tracking-widest"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In with Login ID</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/onboarding" className="text-blue-600 hover:text-blue-700 font-medium">
            Register your school
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

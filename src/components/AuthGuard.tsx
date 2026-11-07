import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { authService, AuthSessionState } from '../services/authService';

interface AuthGuardProps {
  children?: React.ReactNode;
  allowedRoles?: Array<'admin' | 'principal' | 'principal_admin' | 'teacher' | 'student' | 'parent' | 'bursar' | 'vp' | 'vice_principal'>;
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const location = useLocation();

  useEffect(() => {
    checkAuth();

    const { data: authListener } = authService.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const identity = await authService.resolveCurrentIdentity();
      setSessionState(identity);
      if (onSessionResolved) {
        onSessionResolved(identity);
      }

      // Check if session exists via getSession or identity
      const session = await authService.getSession();
      // Allow development/demo bypass if session or identity is verified or demo mode
      const authed = !!session && identity.isAuthenticated;
      setIsAuthenticated(authed);
    } catch (error) {
      console.warn('Auth verify error:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading || isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm font-medium text-slate-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  const roleAliases: Record<string, string> = { principal: 'principal_admin', vp: 'vice_principal' };
  const resolvedRole = sessionState?.role ? (roleAliases[sessionState.role] || sessionState.role) : null;
  const isRoleAuthorized = !allowedRoles || (!!resolvedRole && allowedRoles.some(role => (roleAliases[role] || role) === resolvedRole));

  if (!isAuthenticated || !isRoleAuthorized) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children ? children : <Outlet />}</>;
};

export default AuthGuard;

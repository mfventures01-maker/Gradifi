import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { authService, AuthSessionState } from '../services/authService';

interface AuthGuardProps {
  children?: React.ReactNode;
  allowedRoles?: Array<'admin' | 'principal' | 'principal_admin' | 'teacher' | 'student' | 'parent' | 'bursar' | 'vp' | 'vice_principal' | 'dean' | 'hod' | 'adviser' | 'lecturer'>;
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
  const routeRoleMap: Record<string, string[]> = {
    '/portal/principal': ['principal_admin', 'admin'],
    '/dashboard': ['principal_admin', 'admin'],
    '/portal/vp': ['vice_principal'],
    '/portal/bursar': ['bursar'],
    '/portal/teacher': ['teacher'],
    '/portal/student': ['student'],
    '/portal/parent': ['parent'],
    '/portal/higher-education': ['dean', 'hod', 'adviser', 'lecturer'],
    '/grading': ['teacher', 'principal_admin', 'admin', 'dean', 'hod', 'adviser', 'lecturer'],
  };
  const routeRequiredRoles = routeRoleMap[location.pathname] ??
    (location.pathname.startsWith('/grading/')
      ? ['teacher', 'principal_admin', 'admin', 'dean', 'hod', 'adviser', 'lecturer']
      : location.pathname.startsWith('/cbt/builder') || location.pathname === '/cbt/manager'
        ? ['teacher', 'principal_admin', 'admin', 'dean', 'hod', 'adviser', 'lecturer']
        : location.pathname.startsWith('/cbt/runner')
          ? ['student']
          : location.pathname.startsWith('/cbt/results')
            ? ['student', 'teacher', 'principal_admin', 'admin', 'dean', 'hod', 'adviser', 'lecturer']
            : undefined);
  const allowedByProp = !allowedRoles || (!!resolvedRole && allowedRoles.some(role => (roleAliases[role] || role) === resolvedRole));
  const allowedByRoute = !routeRequiredRoles || (!!resolvedRole && routeRequiredRoles.includes(resolvedRole));
  const isRoleAuthorized = allowedByProp && allowedByRoute;

  if (!isAuthenticated || !isRoleAuthorized) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children ? children : <Outlet />}</>;
};

export default AuthGuard;

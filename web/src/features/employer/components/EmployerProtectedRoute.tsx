
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface EmployerProtectedRouteProps {
  children: ReactNode;
  isAuthenticated: boolean;
  loading?: boolean;
  loginPath?: string;
  loadingFallback?: ReactNode;
}

export function EmployerProtectedRoute({
  children,
  isAuthenticated,
  loading = false,
  loginPath = '/login',
  loadingFallback = null,
}: EmployerProtectedRouteProps) {
  const location = useLocation();

  if (loading) {
    return <>{loadingFallback}</>;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={loginPath}
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
        }}
      />
    );
  }

  return <>{children}</>;
}

export default EmployerProtectedRoute;

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
interface Props { children: ReactNode }

export function EmployerProtectedRoute({ children }) {
  return <Navigate to="/login" replace state={{ from: '/careers/employer' }} />;
}

import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Rol } from 'shared';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactElement;
  roles?: Rol[];
}

// Destino de cada rol tras iniciar sesión.
export const homeForRol = (rol: Rol | undefined): string =>
  rol === 'DOCENTE' ? '/mis-grupos' : '/cursos';

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Un DOCENTE no debe entrar a las pantallas de administración.
  if (roles && !roles.includes(user.rol)) {
    return <Navigate to={homeForRol(user.rol)} replace />;
  }

  return children;
}

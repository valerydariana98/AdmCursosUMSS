import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ROL_LABEL, type Rol } from 'shared';
import { useAuth } from '../context/AuthContext';

interface MenuItem {
  to: string;
  label: string;
  icon: string;
  roles: Rol[];
}

// Cada entrada declara para qué rol existe. El ADMIN ve la gestión completa;
// el DOCENTE solo entra a lo que le corresponde.
const menuItems: MenuItem[] = [
  { to: '/mis-grupos', label: 'Mis Grupos', icon: 'users', roles: ['DOCENTE'] },
  { to: '/dashboard', label: 'Dashboard', icon: 'grid', roles: ['ADMIN'] },
  { to: '/cursos', label: 'Cursos', icon: 'document', roles: ['ADMIN'] },
  { to: '/grupos', label: 'Grupos', icon: 'clipboard', roles: ['ADMIN'] },
  { to: '/estudiantes', label: 'Estudiantes', icon: 'user', roles: ['ADMIN'] },
  { to: '/instructores', label: 'Instructores', icon: 'briefcase', roles: ['ADMIN'] },
  { to: '/certificados', label: 'Certificados', icon: 'badge', roles: ['ADMIN', 'DOCENTE'] },
];

const icons: Record<string, React.ReactNode> = {
  grid: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 2 0 01.707.293l5.414 5.414a1 2 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
  ),
  clipboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h4"/></svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
  ),
  briefcase: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
  ),
  badge: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
  ),
};

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visibles = menuItems.filter((item) => user && item.roles.includes(user.rol));

  const iniciales =
    user?.username
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '??';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-64 h-screen bg-sidebar-bg text-white flex flex-col justify-between p-4 shrink-0 select-none font-sans">
      <div>
        <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-white/10 pb-5">
          <div className="w-10 h-10 bg-white text-brand-dark font-black rounded-xl flex items-center justify-center text-lg shadow-md shrink-0">
            U
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-sm text-white leading-snug">Formación Continua</h1>
            <span className="text-xs text-gray-400 font-medium">UMSS</span>
          </div>
        </div>

        <nav className="space-y-1.5">
          {visibles.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-sidebar-active text-white font-semibold shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-sidebar-hover'
                }`
              }
            >
              <span className="w-5 h-5 flex items-center justify-center shrink-0">
                {icons[item.icon]}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10 pt-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-brand-dark font-bold flex items-center justify-center text-xs shrink-0">
            {iniciales}
          </div>
          <div className="flex flex-col text-xs overflow-hidden min-w-0 flex-1">
            <p className="font-bold text-white truncate">{user?.username ?? '—'}</p>
            <p className="text-gray-400 truncate">
              {user ? ROL_LABEL[user.rol] : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-sidebar-hover transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

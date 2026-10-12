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
  { to: '/estudiantes', label: 'Inscripciones', icon: 'user', roles: ['ADMIN'] },
  { to: '/instructores', label: 'Instructores', icon: 'briefcase', roles: ['ADMIN'] },
  { to: '/certificados', label: 'Certificados', icon: 'badge', roles: ['ADMIN', 'DOCENTE'] },
];

const icons: Record<string, React.ReactNode> = {
  grid: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
  ),
  document: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 2 0 01.707.293l5.414 5.414a1 2 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
  ),
  clipboard: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h4"/></svg>
  ),
  users: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
  ),
  user: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
  ),
  briefcase: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
  ),
  badge: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
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
    <aside className="relative w-64 h-screen bg-sidebar-bg text-white flex flex-col justify-between shrink-0 select-none font-sans no-print overflow-hidden">
      {/* Filete vertical de sello en el borde: marca de "lomo" del boletín. */}
      <span className="absolute inset-y-0 left-0 w-[3px] bg-stamp" aria-hidden="true" />

      <div>
        {/* Cabecera / marca institucional */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white text-brand-dark font-serif font-bold flex items-center justify-center text-2xl leading-none">
              U
            </div>
            <div className="leading-none">
              <h1 className="font-serif text-[13px] font-semibold text-white leading-tight tracking-tight">
                Universidad Mayor de San Simón
              </h1>
            </div>
          </div>
        </div>

        {/* Doble regla editorial */}
        <div className="px-5" aria-hidden="true">
          <div className="h-[3px] bg-white/90" />
          <div className="mt-[3px] h-px bg-white/20" />
        </div>

        <p className="px-5 mt-6 mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.3em] text-white/35">
          Índice
        </p>

        <nav className="flex flex-col">
          {visibles.map((item) => {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 py-2.5 pl-5 pr-4 transition-colors duration-150 ${
                    isActive
                      ? 'bg-white text-brand-dark'
                      : 'text-white/55 hover:text-white hover:bg-sidebar-hover'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="w-4 h-4 flex items-center justify-center shrink-0">
                      {icons[item.icon]}
                    </span>
                    <span
                      className={`text-[13px] tracking-tight ${
                        isActive ? 'font-semibold' : 'font-medium'
                      }`}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <span className="absolute inset-y-0 left-0 w-[3px] bg-stamp" aria-hidden="true" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Colofón */}
      <div className="px-5 pb-5">
        <div className="h-px bg-white/12 mb-4" />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 text-white font-mono font-medium flex items-center justify-center text-[11px] shrink-0 ring-1 ring-white/15">
            {iniciales}
          </div>
          <div className="flex flex-col text-xs overflow-hidden min-w-0 flex-1">
            <p className="font-semibold text-white truncate tracking-tight">{user?.username ?? '—'}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40 truncate">
              {user ? ROL_LABEL[user.rol] : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 w-full flex items-center gap-2 border border-white/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55 hover:text-white hover:border-white/40 transition cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

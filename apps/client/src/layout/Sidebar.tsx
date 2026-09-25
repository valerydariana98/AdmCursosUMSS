import React from 'react';

interface SidebarProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  user?: {
    name: string;
    role: string;
    initials: string;
  };
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'cursos', label: 'Cursos', icon: 'document' },
  { id: 'grupos', label: 'Grupos', icon: 'users' },
  { id: 'estudiantes', label: 'Estudiantes', icon: 'user' },
  { id: 'instructores', label: 'Instructores', icon: 'briefcase' },
  { id: 'certificados', label: 'Certificados', icon: 'badge' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath = 'instructores',
  onNavigate,
  user = { name: 'Mario Rocha', role: 'Administrador', initials: 'MR' },
}) => {
  return (
    <aside className="w-64 h-screen bg-[#0C103C] text-white flex flex-col justify-between p-4 shrink-0 select-none font-sans">
      <div>
        {/* LOGO SUPERIOR */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-white/10 pb-5">
          <div className="w-10 h-10 bg-white text-[#0C103C] font-black rounded-xl flex items-center justify-center text-lg shadow-md shrink-0">
            U
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-sm text-white leading-snug">Formación Continua</h1>
            <span className="text-xs text-gray-400 font-medium">UMSS</span>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = currentPath === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate && onNavigate(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#1D3557] text-white font-semibold shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  {item.icon === 'grid' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                  )}
                  {item.icon === 'document' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  )}
                  {item.icon === 'users' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  )}
                  {item.icon === 'user' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  )}
                  {item.icon === 'briefcase' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  )}
                  {item.icon === 'badge' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                  )}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* FOOTER PERFIL */}
      <div className="border-t border-white/10 pt-4 px-2 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-100 text-[#0C103C] font-bold flex items-center justify-center text-xs shrink-0">
          {user.initials}
        </div>
        <div className="flex flex-col text-xs overflow-hidden">
          <p className="font-bold text-white truncate">{user.name}</p>
          <p className="text-gray-400 truncate">{user.role}</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
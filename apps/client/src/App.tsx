// apps/client/src/App.tsx
import { useState } from 'react';
import Sidebar from './layout/Sidebar';
import { useInstructors } from './hooks/useInstructors';
import InstructorsListPage from './pages/instructors/instructorsListPage'
import Prueba from './pages/Prueba';

export default function App() {
  const [currentTab, setCurrentTab] = useState('instructores');

  const {
    instructors,
    totalCount,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
  } = useInstructors();

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* Sidebar Fija y Funcional */}
      <Sidebar
        currentPath={currentTab}
        onNavigate={(path) => setCurrentTab(path)}
      />

      {/* Renders según opción seleccionada en Sidebar */}
      <main className="flex-1 overflow-y-auto">
        {currentTab === 'instructores' ? (
          <InstructorsListPage
            instructors={instructors}
            totalCount={totalCount}
            loading={loading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onNavigateToCreate={() => alert('Próximamente: HU #14 Registrar Instructor')}
            onNavigateToEdit={(inst) => alert(`Próximamente: HU #15 Editar a ${inst.nombres}`)}
            onDeleteInstructor={(inst) => alert(`Próximamente: HU #16 Eliminar a ${inst.nombres}`)}
          />
        ) : (
          <Prueba />
        )}
      </main>
    </div>
  );
}
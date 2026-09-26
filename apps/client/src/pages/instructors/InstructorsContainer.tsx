// apps/client/src/pages/instructors/InstructorsContainer.tsx
import { useState } from 'react';
import { useInstructors } from '../../hooks/useInstructors';
import InstructorsListPage from './InstructorsListPage';
import InstructorCreatePage from './InstructorCreatePage';

export default function InstructorsContainer() {
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');

  const {
    instructors,
    totalCount,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    addInstructor,
  } = useInstructors();

  if (viewMode === 'create') {
    return (
      <InstructorCreatePage
        onSave={async (data) => {
          await addInstructor(data);
          setViewMode('list');
        }}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  return (
    <InstructorsListPage
      instructors={instructors}
      totalCount={totalCount}
      loading={loading}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      onNavigateToCreate={() => setViewMode('create')}
      onNavigateToEdit={(inst) => alert(`Próximamente HU #15: Editar a ${inst.nombres}`)}
      onDeleteInstructor={(inst) => alert(`Próximamente HU #16: Eliminar a ${inst.nombres}`)}
    />
  );
}
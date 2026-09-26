// apps/client/src/pages/instructors/InstructorsContainer.tsx
import { useState } from 'react';
import { useInstructors } from '../../hooks/useInstructors';
import type { Instructor } from '../../types/instructor';
import InstructorsListPage from './InstructorsListPage';
import InstructorFormPage from './InstructorFormPage';

type ViewMode = 'list' | 'create' | 'edit';

export default function InstructorsContainer() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);

  const {
    instructors,
    totalCount,
    page,
    totalPages,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    setPage,
    addInstructor,
    updateInstructor,
  } = useInstructors();

  const goToList = () => {
    setEditingInstructor(null);
    setViewMode('list');
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <InstructorFormPage
        mode={viewMode}
        instructor={editingInstructor ?? undefined}
        onSave={async (data) => {
          if (viewMode === 'edit' && editingInstructor) {
            await updateInstructor(editingInstructor.id, data);
          } else {
            await addInstructor(data);
          }
          goToList();
        }}
        onCancel={goToList}
      />
    );
  }

  return (
    <InstructorsListPage
      instructors={instructors}
      totalCount={totalCount}
      page={page}
      totalPages={totalPages}
      loading={loading}
      error={error}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      onPageChange={setPage}
      onNavigateToCreate={() => {
        setEditingInstructor(null);
        setViewMode('create');
      }}
      onNavigateToEdit={(inst) => {
        setEditingInstructor(inst);
        setViewMode('edit');
      }}
      onDeleteInstructor={(inst) => alert(`Próximamente HU #16: Eliminar a ${inst.nombres}`)}
    />
  );
}

// apps/client/src/pages/instructors/InstructorsContainer.tsx
import { useState } from 'react';
import { useInstructors } from '../../hooks/useInstructors';
import { ApiError } from '../../services/api';
import type { Instructor } from '../../types/instructor';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import InstructorsListPage from './InstructorsListPage';
import InstructorFormPage from './InstructorFormPage';

type ViewMode = 'list' | 'create' | 'edit';

export default function InstructorsContainer() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);

  const [instructorToDelete, setInstructorToDelete] = useState<Instructor | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    deleteInstructor,
  } = useInstructors();

  const goToList = () => {
    setEditingInstructor(null);
    setViewMode('list');
  };

  const closeDeleteModal = () => {
    setInstructorToDelete(null);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!instructorToDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteInstructor(instructorToDelete.id);
      closeDeleteModal();
    } catch (caught) {
      setDeleteError(
        caught instanceof ApiError ? caught.message : 'No se pudo eliminar el docente'
      );
    } finally {
      setDeleting(false);
    }
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
    <>
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
        onDeleteInstructor={(inst) => {
          setDeleteError(null);
          setInstructorToDelete(inst);
        }}
      />

      <Modal
        isOpen={instructorToDelete !== null}
        title="Eliminar docente"
        onClose={closeDeleteModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeDeleteModal} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      >
        {deleteError && <AlertInfo type="warning" title={deleteError} />}

        <p className="mt-2">
          ¿Seguro que deseas eliminar al docente{' '}
          <strong className="text-gray-900">
            {instructorToDelete?.nombres} {instructorToDelete?.apPaterno}
          </strong>
          ? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </>
  );
}

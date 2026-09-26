// apps/client/src/pages/instructors/InstructorsContainer.tsx
import { useInstructors } from '../../hooks/useInstructors';
import InstructorsListPage from './instructorsListPage';

const InstructorsContainer = () => {
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
  );
};

export default InstructorsContainer;
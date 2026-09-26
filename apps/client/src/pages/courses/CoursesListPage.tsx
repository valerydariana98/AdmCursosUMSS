// apps/client/src/pages/courses/CoursesListPage.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AlertInfo from '../../components/AlertInfo';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import TextField from '../../components/TextField';
import { useCourses } from '../../hooks/useCourses';
import { ApiError } from '../../services/api';
import { courseService, type CourseView } from '../../services/courseService';
import type { Course } from '../../types/course';
import { formatDate, formatDateRange } from '../../utils/format';

const TAB_LABELS: Record<CourseView, string> = {
  current: 'Activos',
  archived: 'Pasados',
};

const PencilIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
  </svg>
);

const CoursesListPage = () => {
  const navigate = useNavigate();
  const {
    courses,
    total,
    page,
    totalPages,
    loading,
    error,
    view,
    setView,
    search,
    setSearch,
    setPage,
    refetch,
  } = useCourses();

  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isArchived = view === 'archived';

  const closeDeleteModal = () => {
    setCourseToDelete(null);
    setDeleteError(null);
  };

  const handleDelete = async () => {
    if (!courseToDelete) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await courseService.remove(courseToDelete.id);
      closeDeleteModal();
      refetch();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setDeleteError(caught.message);
      } else {
        setDeleteError(
          caught instanceof ApiError ? caught.message : 'No se pudo eliminar el curso'
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  const tableBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={6} className="py-8 text-center text-gray-400">
            Cargando cursos...
          </td>
        </tr>
      );
    }

    if (courses.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="py-8 text-center text-gray-400">
            No se encontraron cursos.
          </td>
        </tr>
      );
    }

    return courses.map((course) => (
      <tr key={course.id} className="hover:bg-gray-50/60 transition-colors">
        <td className="py-4 px-6">
          <p className="font-bold text-gray-900">{course.nombreCurso}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Costo UMSS: Bs. {course.costoUmss}
          </p>
        </td>
        <td className="py-4 px-4 text-gray-600">{course.duracionHoras} hrs</td>
        <td className="py-4 px-4 text-gray-600">{course.periodo}</td>
        <td className="py-4 px-4 text-gray-600">
          {isArchived ? formatDate(course.fechaFin) : formatDateRange(course.fechaIni, course.fechaFin)}
        </td>
        {isArchived ? (
          <td className="py-4 px-4 text-gray-600">0</td>
        ) : null}
        <td className="py-4 px-4">
          <Badge status={course.estado} inactiveLabel="Finalizado" />
        </td>
        <td className="py-4 px-6 text-right whitespace-nowrap">
          {isArchived ? (
            <span className="text-xs text-gray-400">—</span>
          ) : (
            <span className="space-x-1.5">
              <button
                type="button"
                onClick={() => navigate(`/cursos/${course.id}/editar`)}
                className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-all duration-150 cursor-pointer inline-flex items-center justify-center"
                title="Editar curso"
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setCourseToDelete(course);
                }}
                className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-150 cursor-pointer inline-flex items-center justify-center"
                title="Eliminar curso"
              >
                <TrashIcon />
              </button>
            </span>
          )}
        </td>
      </tr>
    ));
  };

  return (
    <div className="p-8 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Cursos</h1>
          <p className="text-sm text-gray-500">
            Cursos ofertados por el departamento de informática
          </p>
        </div>
        <Link to="/cursos/nuevo">
          <Button variant="primary" icon={<PlusIcon />}>
            Nuevo Curso
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex gap-2">
            {(Object.keys(TAB_LABELS) as CourseView[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setView(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  view === tab
                    ? 'bg-[#111827] text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          <div className="flex-1 sm:max-w-xs sm:ml-auto">
            <TextField
              placeholder="Buscar curso..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
        </div>

        {isArchived && (
          <div className="px-4 pt-4">
            <AlertInfo
              type="info"
              title="Los cursos finalizados son de solo consulta. No se permiten ediciones."
            />
          </div>
        )}

        {error && (
          <div className="px-4 pt-4">
            <AlertInfo type="error" title={error} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Curso</th>
                <th className="py-3.5 px-4">Duración</th>
                <th className="py-3.5 px-4">Periodo</th>
                <th className="py-3.5 px-4">{isArchived ? 'Fecha Fin' : 'Fechas'}</th>
                {isArchived && <th className="py-3.5 px-4">Inscritos</th>}
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-6 text-right">{isArchived ? 'Acción' : 'Acciones'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">{tableBody()}</tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Mostrando {courses.length} de {total} cursos</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={courseToDelete !== null}
        title="Eliminar curso"
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
        {deleteError ? (
          <AlertInfo type="warning" title={deleteError} />
        ) : (
          <p>
            ¿Seguro que deseas eliminar el curso{' '}
            <span className="font-semibold text-gray-900">
              {courseToDelete?.nombreCurso}
            </span>
            ? Esta acción no se puede deshacer.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default CoursesListPage;

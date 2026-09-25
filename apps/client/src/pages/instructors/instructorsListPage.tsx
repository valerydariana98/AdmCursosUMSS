// apps/client/src/pages/instructors/InstructorsListPage.tsx
import React from 'react';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import Select from '../../components/Select';
import Badge from '../../components/Badge';
import { Instructor } from '../../types/instructor';

interface InstructorsListPageProps {
  instructors: Instructor[];
  totalCount: number;
  loading: boolean;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onNavigateToCreate?: () => void;
  onNavigateToEdit?: (instructor: Instructor) => void;
  onDeleteInstructor?: (instructor: Instructor) => void;
}

export const InstructorsListPage: React.FC<InstructorsListPageProps> = ({
  instructors,
  totalCount,
  loading,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onNavigateToCreate,
  onNavigateToEdit,
  onDeleteInstructor,
}) => {
  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen font-sans">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Instructores</h1>
          <p className="text-sm text-gray-500">Docentes registrados en el sistema</p>
        </div>
        <Button
          variant="primary"
          onClick={onNavigateToCreate}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Nuevo Instructor
        </Button>
      </div>

      {/* Tarjeta Contenedora de Tabla y Filtros */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Barra de Filtros */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <TextField
              placeholder="Buscar por nombre o CI..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              options={[
                { value: 'todos', label: 'Todos los estados' },
                { value: 'activo', label: 'Activo' },
                { value: 'inactivo', label: 'Inactivo' },
              ]}
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Instructor</th>
                <th className="py-3.5 px-4">CI</th>
                <th className="py-3.5 px-4">Teléfono</th>
                <th className="py-3.5 px-4">Cargo</th>
                <th className="py-3.5 px-4">Grupos Asignados</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Cargando instructores...
                  </td>
                </tr>
              ) : instructors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No se encontraron instructores registrados.
                  </td>
                </tr>
              ) : (
                instructors.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-bold text-gray-900">
                          {item.nombres} {item.apPaterno} {item.apMaterno}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.email || 'Sin correo'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600 font-medium">{item.ci}</td>
                    <td className="py-4 px-4 text-gray-600">{item.telefono}</td>
                    <td className="py-4 px-4 text-gray-600">{item.cargo}</td>
                    <td className="py-4 px-4 text-gray-600">
                      {item.gruposAsignadosCount ?? 0} {item.gruposAsignadosCount === 1 ? 'grupo' : 'grupos'}
                    </td>
                    <td className="py-4 px-4">
                      <Badge status={item.estado} />
                    </td>
                    <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => onNavigateToEdit && onNavigateToEdit(item)}
                        className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-all duration-150 cursor-pointer inline-flex items-center justify-center"
                        title="Editar instructor"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteInstructor && onDeleteInstructor(item)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-150 cursor-pointer inline-flex items-center justify-center"
                        title="Eliminar instructor"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación / Resumen */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>
            Mostrando {instructors.length} de {totalCount} instructores
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled>
              Anterior
            </Button>
            <Button size="sm" variant="secondary" disabled>
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorsListPage;
// apps/client/src/components/InstructorGroupsModal.tsx
import { useEffect, useState } from 'react';
import type { InstructorGroup } from 'shared';
import Modal from './Modal';
import Button from './Button';
import EstadoBadge from './EstadoBadge';
import { groupService } from '../services/groupService';

interface InstructorGroupsModalProps {
  instructorId: number | null;
  instructorNombre: string;
  onClose: () => void;
}

const formatDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
};

// Muestra todos los grupos asignados a un docente, con el periodo y las fechas
// que su grupo hereda del curso.
const InstructorGroupsModal = ({
  instructorId,
  instructorNombre,
  onClose,
}: InstructorGroupsModalProps) => {
  const [groups, setGroups] = useState<InstructorGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (instructorId === null) return;

    let vigente = true;
    setLoading(true);
    setError(null);

    groupService
      .listByInstructor(instructorId)
      .then((data) => {
        if (vigente) setGroups(data);
      })
      .catch((caught) => {
        if (vigente) {
          setError(
            caught instanceof Error ? caught.message : 'No se pudieron cargar los grupos'
          );
        }
      })
      .finally(() => {
        if (vigente) setLoading(false);
      });

    return () => {
      vigente = false;
    };
  }, [instructorId]);

  const th = 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400';

  return (
    <Modal
      isOpen={instructorId !== null}
      title={`Grupos asignados a ${instructorNombre}`}
      onClose={onClose}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {loading && <p className="text-gray-500">Cargando grupos...</p>}

      {!loading && error && <p className="text-red-600">{error}</p>}

      {!loading && !error && groups.length === 0 && (
        <p className="text-gray-500">Este docente no tiene grupos asignados.</p>
      )}

      {!loading && !error && groups.length > 0 && (
        <>
          <div className="mb-4 max-h-72 overflow-y-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className={th}>Curso</th>
                  <th className={th}>Grupo</th>
                  <th className={th}>Periodo</th>
                  <th className={th}>Inicio</th>
                  <th className={th}>Fin</th>
                  <th className={th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2.5 font-medium text-gray-900">
                      {group.nombreCurso}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">Grupo {group.numGrupo}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">
                      {group.periodo}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">
                      {formatDate(group.fechaIni)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">
                      {formatDate(group.fechaFin)}
                    </td>
                    <td className="px-3 py-2.5">
                      <EstadoBadge estado={group.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">
            Las fechas y el periodo los hereda el grupo de su curso.
          </p>
        </>
      )}
    </Modal>
  );
};

export default InstructorGroupsModal;

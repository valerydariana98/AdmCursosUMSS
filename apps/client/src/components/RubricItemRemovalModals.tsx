// apps/client/src/components/RubricItemRemovalModals.tsx
import React from 'react';
import { RUBRIC_CATEGORY_LABEL } from 'shared';
import AlertInfo from './AlertInfo';
import Button from './Button';
import Modal from './Modal';
import type { RubricRemovalCheck, RubricRemovalStage } from '../types/rubric';

export interface RubricItemRemovalModalsProps {
  isOpen: boolean;
  /** `warning` informa cuántas notas se pierden; `final` pide la confirmación definitiva. */
  stage: RubricRemovalStage;
  /** Conteo calculado por el servidor: el cliente no estima notas. */
  check: RubricRemovalCheck | null;
  loading: boolean;
  error: string | null;
  /** Cancela en cualquiera de los dos y deja el ítem intacto. */
  onCancel: () => void;
  onConfirm: () => void;
}

const pluralize = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`;

// Resumen "Asistencia (3), Exámenes (2)" de las categorías con notas afectadas.
// Se deduplica por categoría: dos ítems de la misma categoría comparten las mismas
// notas y no pueden aparecer dos veces en el mismo texto.
const affectedCategories = (check: RubricRemovalCheck): string => {
  const byCategory = new Map(check.items.map((item) => [item.category, item.affectedGrades]));

  return Array.from(byCategory.entries())
    .filter(([, grades]) => grades > 0)
    .map(
      ([category, grades]) =>
        `${RUBRIC_CATEGORY_LABEL[category]} (${pluralize(grades, 'nota', 'notas')})`
    )
    .join(', ');
};

// Los dos modales que exige la eliminación de un ítem con notas registradas: el
// primero informa cuántas notas se pierden y pide seguir; el segundo confirma con
// el texto explícito de que no se puede deshacer. Los dos reaprovechan el `Modal`
// del proyecto (role="dialog", foco al abrir y tecla Escape).
const RubricItemRemovalModals: React.FC<RubricItemRemovalModalsProps> = ({
  isOpen,
  stage,
  check,
  loading,
  error,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const affectedGrades = check?.totalAffectedGrades ?? 0;
  const gradesText = pluralize(affectedGrades, 'nota registrada', 'notas registradas');
  const categoriesText = check ? affectedCategories(check) : '';

  if (stage === 'warning') {
    return (
      <Modal
        isOpen
        title="Eliminar evaluación con notas registradas"
        onClose={onCancel}
        footer={
          <>
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={onConfirm} disabled={loading || !check}>
              {loading ? 'Verificando...' : 'Continuar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {loading && (
            <AlertInfo type="info" title="Contando las notas registradas de la categoría..." />
          )}

          {error && !loading && <AlertInfo type="error" title={error} />}

          {!loading && !error && check && (
            <AlertInfo
              type="warning"
              title={`Vas a eliminar ${gradesText}`}
              subtitle={`Notas de ${categoriesText} del grupo. Los ítems afectados: ${check.items
                .map((item) => item.name)
                .join(', ')}`}
            />
          )}

          <p>
            Al guardar la rúbrica, esas notas se perderán. ¿Querés continuar con la eliminación?
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen
      title="Confirmar eliminación definitiva"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Sí, eliminar {gradesText}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <AlertInfo
          type="error"
          title="Esta acción no se puede deshacer"
          subtitle={`Se perderán ${gradesText} de ${categoriesText} y el ítem desaparecerá de la rúbrica del grupo.`}
        />

        <p>
          La eliminación se aplica al guardar. Si cancelás ahora, la rúbrica queda tal como está y
          las notas se conservan.
        </p>
      </div>
    </Modal>
  );
};

export default RubricItemRemovalModals;

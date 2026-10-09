// apps/client/src/pages/groups/GroupRubricPage.tsx
// Vista de configuración y gestión de la rúbrica de evaluación de un grupo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RUBRIC_TOTAL_MESSAGE, validateRubric, type RubricItemIssue } from 'shared';
import AlertInfo from '../../components/AlertInfo';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import RubricItemRemovalModals from '../../components/RubricItemRemovalModals';
import RubricItemRow from '../../components/RubricItemRow';
import RubricTotalIndicator from '../../components/RubricTotalIndicator';
import { useRubric } from '../../hooks/useRubric';
import { rubricFormSchema, type RubricFormData } from '../../schemas/rubricSchema';
import { ApiError, type ApiFieldError } from '../../services/api';
import {
  RUBRIC_CATEGORY_OPTIONS,
  createRubricItemForm,
  toRubricItemFormValues,
  toRubricItemInputs,
  toRubricItemsSnapshot,
  type RubricCategory,
  type RubricItemFormValues,
  type RubricItemInput,
  type RubricRemovalCheck,
  type RubricRemovalStage,
} from '../../types/rubric';

type ItemErrors = { name?: string; category?: string; percentage?: string };
type FieldErrors = Record<string, ItemErrors>;

type RubricPayload = { items: RubricItemInput[] };

// Los diálogos de eliminación tienen dos orígenes distintos: quitar un ítem del
// formulario (`form`) o el 409 del servidor al guardar (`save`). En el primero solo
// hay que sacar la fila; en el segundo hay que reintentar el guardado completo con
// la confirmación.
type RemovalFlow =
  | { kind: 'closed' }
  | { kind: 'form'; key: string }
  | { kind: 'save' };

const NO_RUBRIC_ITEMS_ERROR = 'No se pudo verificar las notas de la evaluación';

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
  </svg>
);

// El 409 llega con `meta.removalCheck`: el servidor es quien cuenta las notas, así
// que el cliente no arma el objeto a mano.
const readRemovalCheck = (meta: unknown): RubricRemovalCheck | null => {
  if (typeof meta !== 'object' || meta === null) return null;

  const { removalCheck } = meta as { removalCheck?: RubricRemovalCheck };

  return removalCheck ?? null;
};

const errorsFor = (fieldErrors: FieldErrors, key: string): ItemErrors | undefined =>
  fieldErrors[key];

const applyItemIssues = (issues: RubricItemIssue[], items: RubricItemFormValues[]): FieldErrors =>
  issues.reduce<FieldErrors>((acc, issue) => {
    const key = items[issue.index]?.key;
    if (!key) return acc;

    acc[key] = { ...acc[key], [issue.field]: issue.message };
    return acc;
  }, {});

// El servidor reporta los errores con la forma `items.<indice>.<campo>`; los
// índices se translated a las keys del formulario para marcar el ítem exacto.
const applyServerErrors = (
  errors: ApiFieldError[],
  items: RubricItemFormValues[]
): { fieldErrors: FieldErrors; generalError: string | null } => {
  let generalError: string | null = null;
  const fieldErrors: FieldErrors = {};

  for (const itemError of errors) {
    const [collection, rawIndex, field] = itemError.path.split('.');

    if (collection !== 'items') continue;

    if (rawIndex === undefined) {
      generalError = itemError.message;
      continue;
    }

    const key = items[Number(rawIndex)]?.key;
    if (!key) continue;

    fieldErrors[key] = {
      ...fieldErrors[key],
      [field as keyof ItemErrors]: itemError.message,
    };
  }

  return { fieldErrors, generalError };
};

// El `id` de cada ítem viaja al servidor para que la edición lo actualice en el
// lugar: los ítems nuevos lo mandan sin id y el servidor les asigna uno.
const toPayload = (items: RubricFormData): RubricPayload => ({
  items: items.map(({ id, name, category, percentage }) => ({ id, name, category, percentage })),
});

const GroupRubricPage = () => {
  const { idCurso, idGrupo } = useParams();
  const navigate = useNavigate();
  const cursoId = Number(idCurso);
  const groupId = Number(idGrupo);

  const { view, loading, error, saving, isForbidden, saveRubric, getRemovalImpact } =
    useRubric(groupId);

  const [items, setItems] = useState<RubricItemFormValues[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [removalFlow, setRemovalFlow] = useState<RemovalFlow>({ kind: 'closed' });
  const [removalStage, setRemovalStage] = useState<RubricRemovalStage>('warning');
  const [removalCheck, setRemovalCheck] = useState<RubricRemovalCheck | null>(null);
  const [removalLoading, setRemovalLoading] = useState(false);
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [discardPromptOpen, setDiscardPromptOpen] = useState(false);

  const backPath = `/cursos/${cursoId}/estudiantes?grupo=${groupId}`;

  // La rúbrica del grupo se carga para editarla; si no existe, el formulario
  // arranca con una fila para completarlo. Cada respuesta del servidor (carga o
  // guardado) deja el formulario como línea base de "sin cambios".
  const savedSnapshot = useRef<string | null>(null);

  useEffect(() => {
    if (!view) return;

    const loaded = view.rubric ? toRubricItemFormValues(view.rubric.items) : [createRubricItemForm()];

    setItems(loaded);
    setFieldErrors({});
    setSubmitError(null);
    savedSnapshot.current = toRubricItemsSnapshot(loaded);
  }, [view]);

  // Las reglas de negocio (suma exacta de 100%, límites del porcentaje) ya viven
  // en `validateRubric`, la misma función que usa el servidor.
  const validation = useMemo(() => validateRubric(toRubricItemInputs(items)), [items]);
  const firstIssue = validation.issues[0];
  const saveDisabled = saving || !validation.isValid;
  // Mientras no se pueda guardar se explica por qué: primero el problema de un
  // ítem concreto y, si no hay, lo que falta de la suma.
  const saveBlockedReason = firstIssue?.message ?? RUBRIC_TOTAL_MESSAGE[validation.state];

  // La `key` local de cada fila cambia en cada render, así que la huella compara
  // solo lo que el docente puede editar.
  const snapshot = useMemo(() => toRubricItemsSnapshot(items), [items]);
  const hasUnsavedChanges = savedSnapshot.current !== null && savedSnapshot.current !== snapshot;

  // Salir de la vista con cambios sin guardar pide confirmación. `beforeunload`
  // cubre cerrar la pestaña o recargar; la salida dentro de la app se resuelve en
  // `handleCancel`. No se usa `useBlocker` porque exige un data router
  // (`createBrowserRouter`) y la app se monta con `BrowserRouter`.
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // `returnValue` es lo que sigue viendo el prompt nativo en algunos navegadores.
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleCancel = () => {
    if (hasUnsavedChanges && !saving) {
      setDiscardPromptOpen(true);
      return;
    }

    navigate(backPath);
  };

  const handleDiscardAndLeave = () => {
    setDiscardPromptOpen(false);
    setSubmitError(null);
    setSuccessMessage(null);
    navigate(backPath);
  };

  const updateItem = (key: string, patch: Partial<RubricItemFormValues>) => {
    setItems((previous) =>
      previous.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
    setSuccessMessage(null);
  };

  const handleNameChange = (key: string, name: string) => updateItem(key, { name });
  const handleCategoryChange = (key: string, category: string) =>
    updateItem(key, { category: category as RubricCategory });
  const handlePercentageChange = (key: string, percentage: string) =>
    updateItem(key, { percentage });

  const addItem = () => {
    setItems((previous) => [...previous, createRubricItemForm()]);
    setSuccessMessage(null);
  };

  // Sacar el ítem de la lista es la única forma de eliminarlo: el borrado real
  // ocurre al guardar, dentro de la transacción del servidor.
  const dropItem = (key: string) => {
    setItems((previous) => previous.filter((item) => item.key !== key));
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
    setSuccessMessage(null);
  };

  const closeRemovalDialogs = () => {
    setRemovalFlow({ kind: 'closed' });
    setRemovalStage('warning');
    setRemovalCheck(null);
    setRemovalError(null);
    setRemovalLoading(false);
  };

  const requestRemoveItem = async (key: string) => {
    const item = items.find((candidate) => candidate.key === key);
    if (!item) return;

    // Un ítem agregado en esta sesión todavía no está guardado, así que no tiene
    // notas registradas: sale con el comportamiento normal, sin modales.
    if (item.id === undefined) {
      dropItem(key);
      return;
    }

    setRemovalFlow({ kind: 'form', key });
    setRemovalStage('warning');
    setRemovalCheck(null);
    setRemovalError(null);
    setRemovalLoading(true);

    // El conteo de notas lo pide al servidor: si el ítem no tiene, se quita
    // directo; si tiene, arranca la cadena de dos modales.
    try {
      const check = await getRemovalImpact(item.id);

      if (!check.requiresConfirmation) {
        closeRemovalDialogs();
        dropItem(key);
        return;
      }

      setRemovalCheck(check);
      setRemovalLoading(false);
    } catch (caught) {
      setRemovalLoading(false);
      setRemovalError(caught instanceof ApiError ? caught.message : NO_RUBRIC_ITEMS_ERROR);
    }
  };

  // Confirmar el primer modal abre el segundo; el segundo sí aplica lo que
  // corresponda: quitar el ítem del formulario, o reintentar el guardado que el
  // servidor había bloqueado.
  const handleRemovalConfirm = () => {
    if (removalStage === 'warning') {
      setRemovalStage('final');
      return;
    }

    if (removalFlow.kind === 'form') {
      dropItem(removalFlow.key);
      closeRemovalDialogs();
      return;
    }

    if (removalFlow.kind === 'save') {
      const parsed = rubricFormSchema.safeParse(items);

      if (parsed.success) {
        void persist(toPayload(parsed.data), true);
      }
    }
  };

  // Un único camino de escritura: el guardado normal y el reintento posterior a
  // los dos modales. `confirmGradeRemoval` solo viaja en el reintento.
  const persist = async (payload: RubricPayload, confirmGradeRemoval = false) => {
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      await saveRubric({ items: payload.items, confirmGradeRemoval });
      closeRemovalDialogs();
      setSuccessMessage('Rúbrica guardada correctamente');
    } catch (caught) {
      if (caught instanceof ApiError) {
        // 409: el servidor cuenta las notas de los ítems que se están quitando y
        // pide confirmación. Los modales se arman con ese conteo, no con una
        // estimación del cliente.
        const check = readRemovalCheck(caught.meta);

        if (caught.status === 409 && check?.requiresConfirmation) {
          setRemovalFlow({ kind: 'save' });
          setRemovalStage('warning');
          setRemovalCheck(check);
          return;
        }

        if (caught.errors.length > 0) {
          const { fieldErrors: serverFieldErrors, generalError } = applyServerErrors(
            caught.errors,
            items
          );
          setFieldErrors(serverFieldErrors);
          setSubmitError(generalError ?? caught.message);
        } else {
          setSubmitError(caught.message);
        }
        return;
      }

      setSubmitError('No se pudo guardar la rúbrica');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Primero se parsean las cadenas del formulario; las reglas de negocio ya
    // están calculadas en `validation` y se vuelven a comprobar por si acaso.
    const parsed = rubricFormSchema.safeParse(items);

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};

      parsed.error.issues.forEach((issue) => {
        const [rawIndex, field] = issue.path;
        const key = items[Number(rawIndex)]?.key;
        if (!key) return;

        nextErrors[key] = { ...nextErrors[key], [field as keyof ItemErrors]: issue.message };
      });

      setFieldErrors(nextErrors);
      setSubmitError('Revisa los datos de las evaluaciones antes de guardar');
      return;
    }

    if (!validation.isValid) {
      setFieldErrors(applyItemIssues(validation.issues, items));
      setSubmitError('Revisa los datos de las evaluaciones antes de guardar');
      return;
    }

    setFieldErrors({});

    await persist(toPayload(parsed.data));
  };

  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Cargando rúbrica...</div>;
  }

  if (isForbidden) {
    return (
      <div className="p-8 font-sans max-w-2xl space-y-4">
        <nav className="flex items-center gap-2 text-xs text-gray-400">
          <Link to="/cursos" className="hover:text-gray-600">
            Cursos
          </Link>
          <span>/</span>
          <Link to={backPath} className="hover:text-gray-600">
            Grupo
          </Link>
          <span>/</span>
          <span className="text-gray-600 font-medium">Rúbrica</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
        <AlertInfo
          type="error"
          title={error?.message ?? 'El grupo seleccionado no te pertenece'}
          subtitle="Solo el docente asignado al grupo puede configurar su rúbrica de evaluación"
        />
        <Link to={backPath}>
          <Button variant="secondary">Volver al grupo</Button>
        </Link>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="p-8 font-sans max-w-2xl space-y-4">
        <AlertInfo type="error" title={error?.message ?? 'No se pudo cargar la rúbrica'} />
        <Link to={backPath}>
          <Button variant="secondary">Volver al grupo</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 font-sans">
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <Link to="/cursos" className="hover:text-gray-600">
          Cursos
        </Link>
        <span>/</span>
        <Link to={backPath} className="hover:text-gray-600">
          Grupos
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">Rúbrica</span>
      </nav>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Rúbrica de evaluación · Grupo {view.group.number}
          </h1>
          <p className="text-sm text-gray-500">{view.group.courseName}</p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">Reglas del curso</h2>
          <p className="text-xs text-gray-500 mb-4">
            Estos valores se heredan del curso y no se editan desde la rúbrica.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nota mínima de aprobación
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{view.policy.passingGrade}</p>
            </div>
            <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Máximo de faltas
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{view.policy.maxAbsences}</p>
            </div>
          </div>
        </section>

        {submitError && (
          <AlertInfo type="error" title={submitError} />
        )}

        {successMessage && <AlertInfo type="success" title={successMessage} />}

        <form onSubmit={handleSubmit} className="space-y-6">
          <RubricTotalIndicator total={validation.totalPercentage} state={validation.state} />

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Componentes de la evaluación
                </h2>
                <p className="text-xs text-gray-500">
                  Los porcentajes de todos los ítems deben sumar 100%
                </p>
              </div>
              <Button
                variant="secondary"
                icon={<PlusIcon />}
                onClick={addItem}
                disabled={saving}
              >
                Agregar evaluación
              </Button>
            </div>

            <div className="hidden md:grid grid-cols-12 gap-3 px-1">
              <p className="md:col-span-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Evaluación
              </p>
              <p className="md:col-span-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Categoría
              </p>
              <p className="md:col-span-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Porcentaje
              </p>
            </div>

            {items.map((item) => (
              <RubricItemRow
                key={item.key}
                name={item.name}
                category={item.category}
                percentage={item.percentage}
                categoryOptions={RUBRIC_CATEGORY_OPTIONS}
                errors={errorsFor(fieldErrors, item.key)}
                disabled={saving}
                onNameChange={(value) => handleNameChange(item.key, value)}
                onCategoryChange={(value) => handleCategoryChange(item.key, value)}
                onPercentageChange={(value) => handlePercentageChange(item.key, value)}
                onRemove={() => requestRemoveItem(item.key)}
              />
            ))}

            {items.length === 0 && (
              <AlertInfo
                type="info"
                title="La rúbrica todavía no tiene evaluaciones"
                subtitle="Agrega al menos una evaluación para poder guardarla"
              />
            )}
          </section>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-4">
            <p className="text-xs text-gray-500">
              {saveDisabled && !saving
                ? saveBlockedReason
                : 'La rúbrica se asociará al grupo seleccionado'}
            </p>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={saving} onClick={handleCancel}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={saveDisabled}>
                {saving ? 'Guardando...' : 'Guardar rúbrica'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <RubricItemRemovalModals
        isOpen={removalFlow.kind !== 'closed'}
        stage={removalStage}
        check={removalCheck}
        loading={removalLoading}
        error={removalError}
        onCancel={closeRemovalDialogs}
        onConfirm={handleRemovalConfirm}
      />

      <Modal
        isOpen={discardPromptOpen}
        title="Hay cambios sin guardar"
        onClose={() => setDiscardPromptOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDiscardPromptOpen(false)}>
              Seguir editando
            </Button>
            <Button variant="danger" onClick={handleDiscardAndLeave}>
              Salir sin guardar
            </Button>
          </>
        }
      >
        <p>
          Los cambios que hiciste en la rúbrica se perderán si salís ahora. Guardá antes de
          continuar.
        </p>
      </Modal>
    </div>
  );
};

export default GroupRubricPage;
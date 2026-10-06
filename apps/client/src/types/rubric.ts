import {
  RUBRIC_CATEGORIES,
  RUBRIC_CATEGORY_LABEL,
  type Rubric,
  type RubricCategory,
  type RubricGroupInfo,
  type RubricItem,
  type RubricItemInput,
  type RubricItemRemovalImpact,
  type RubricPolicy,
  type RubricRemovalCheck,
  type RubricView,
  type UpsertRubric,
} from 'shared';
import type { SelectOption } from '../components/Select';

export type {
  Rubric,
  RubricCategory,
  RubricGroupInfo,
  RubricItem,
  RubricItemInput,
  RubricItemRemovalImpact,
  RubricPolicy,
  RubricRemovalCheck,
  RubricView,
  UpsertRubric,
};

export const RUBRIC_CATEGORY_OPTIONS: SelectOption[] = RUBRIC_CATEGORIES.map((category) => ({
  value: category,
  label: RUBRIC_CATEGORY_LABEL[category],
}));

// Etapas de la eliminación de un ítem con notas: primero la advertencia con el
// conteo y después la confirmación final. Cancelar en cualquiera deja el ítem
// intacto.
export type RubricRemovalStage = 'warning' | 'final';

// El formulario trabaja con cadenas porque los ítems son inputs controlados;
// el porcentaje se convierte recién al calcular la suma y al guardar.
export interface RubricItemFormValues {
  key: string;
  // Id del ítem ya guardado. Viaja al servidor para que la edición lo actualice en
  // el lugar en vez de borrarlo y recrearlo (y así no perder las notas que lo
  // referencian).
  id?: number;
  name: string;
  category: RubricCategory;
  percentage: string;
}

let itemKeySeed = 0;

export const createRubricItemForm = (item?: RubricItem): RubricItemFormValues => {
  itemKeySeed += 1;

  return {
    key: `rubric-item-${itemKeySeed}`,
    id: item?.id,
    name: item?.name ?? '',
    category: item?.category ?? 'attendance',
    percentage: item ? String(item.percentage) : '',
  };
};

export const toRubricItemFormValues = (items: RubricItem[]): RubricItemFormValues[] =>
  items.map(createRubricItemForm);

// Huella del formulario para detectar cambios sin guardar. Ignora la `key` local
// porque cambia en cada render y no significa que el docente editó algo.
export const toRubricItemsSnapshot = (items: RubricItemFormValues[]): string =>
  JSON.stringify(
    items.map((item) => [
      item.id ?? null,
      item.name.trim(),
      item.category,
      item.percentage.trim(),
    ])
  );

// Acepta coma o punto como separador decimal. Una cadena vacía se convierte en
// NaN (y no en 0) para que la validación reporte "debe ser un número" en vez de
// "debe ser mayor a 0".
export const parsePercentage = (raw: string): number => {
  const trimmed = raw.trim().replace(',', '.');

  return trimmed === '' ? Number.NaN : Number(trimmed);
};

export const toRubricItemInputs = (items: RubricItemFormValues[]): RubricItemInput[] =>
  items.map((item) => ({
    id: item.id,
    name: item.name.trim(),
    category: item.category,
    percentage: parsePercentage(item.percentage),
  }));
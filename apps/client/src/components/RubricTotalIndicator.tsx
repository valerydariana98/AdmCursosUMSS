import React from 'react';
import { RUBRIC_TOTAL_MESSAGE, RUBRIC_TOTAL_PERCENTAGE, type RubricTotalState } from 'shared';

export interface RubricTotalIndicatorProps {
  total: number;
  state: RubricTotalState;
}

const STATE_STYLES: Record<RubricTotalState, string> = {
  empty: 'bg-gray-50 text-gray-600 border-gray-200',
  incomplete: 'bg-amber-50 text-amber-800 border-amber-300',
  complete: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  exceeded: 'bg-red-50 text-red-800 border-red-300',
};

// Indicador en vivo de la suma acumulada: cambia de color según falte, sobre o
// alcance el 100% exigido.
const RubricTotalIndicator: React.FC<RubricTotalIndicatorProps> = ({ total, state }) => {
  const formattedTotal = Number.isFinite(total) ? total.toFixed(2) : '0.00';

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-2xl px-5 py-4 ${STATE_STYLES[state]}`}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold">Suma de porcentajes</span>
        <span className="text-3xl font-bold tabular-nums" data-testid="rubric-total">
          {formattedTotal}%
        </span>
        <span className="text-sm font-medium opacity-70">de {RUBRIC_TOTAL_PERCENTAGE}%</span>
      </div>

      <p className="text-sm font-semibold" role="status">
        {RUBRIC_TOTAL_MESSAGE[state]}
      </p>
    </div>
  );
};

export default RubricTotalIndicator;
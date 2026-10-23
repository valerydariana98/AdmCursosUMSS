// apps/client/src/pages/certificates/components/ElementPropsPanel.tsx
// Panel lateral con las propiedades del elemento seleccionado (HU-02).
//
// El botón de cada variable inserta su etiqueta en el punto del cursor en lugar
// de al final del texto: quien diseña un certificado escribe la frase alrededor
// de los datos ("Otorga el presente a {nombre_estudiante} por haber aprobado el
// curso {nombre_curso} con nota {nota_final}"), no una lista de variables.

import { useRef } from 'react';
import type { CertificateVariable } from 'shared';
import { CERTIFICATE_VARIABLES } from 'shared';
import type { ElementoBorrador } from './CertificateCanvas';

const FUENTES = ['Helvetica', 'Helvetica-Bold', 'Times-Roman', 'Courier'];

const ALINEACIONES: { value: ElementoBorrador['alineacion']; label: string }[] = [
  { value: 'izquierda', label: 'Izquierda' },
  { value: 'centro', label: 'Centro' },
  { value: 'derecha', label: 'Derecha' },
];

interface ElementPropsPanelProps {
  elemento: ElementoBorrador | null;
  onCambiar: (cambios: Partial<ElementoBorrador>) => void;
  onResolverEjemplo: (texto: string) => string;
}

const ElementPropsPanel = ({
  elemento,
  onCambiar,
  onResolverEjemplo,
}: ElementPropsPanelProps) => {
  const areaTexto = useRef<HTMLTextAreaElement>(null);
  if (!elemento) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Elemento seleccionado</h2>
        <p className="text-xs text-gray-500">
          Seleccione un bloque del lienzo para editar su contenido, o haga clic en el fondo para
          crear uno nuevo.
        </p>


      </div>
    );
  }

  // La variable entra donde está el cursor, no al final del texto: quien diseña
  // escribe la frase alrededor de los datos, no una lista de variables sueltas.
  const insertarVariable = (clave: string) => {
    // Sustituye todo el bloque por la variable elegida, para no mezclar texto
    // anterior con la nueva etiqueta.
    onCambiar({ texto: clave });

    const area = areaTexto.current;
    if (area) {
      requestAnimationFrame(() => {
        area.focus();
        area.setSelectionRange(clave.length, clave.length);
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Bloque de texto</h2>
        <span className="text-[11px] font-semibold text-gray-400 uppercase">Texto</span>
      </div>

      <>
          <textarea
            ref={areaTexto}
            value={elemento.texto}
            onChange={(event) => onCambiar({ texto: event.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-mid focus:ring-2 focus:ring-brand-mid/20 mb-2"
            placeholder="Escriba el texto e inserte variables"
          />

          <p className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
            Insertar variable
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {CERTIFICATE_VARIABLES.map((variable: CertificateVariable) => (
              <button
                key={variable.key}
                type="button"
                title={`${variable.label} · ${variable.origen}`}
                onClick={() => insertarVariable(variable.key)}
                className="px-2.5 py-1 rounded-lg bg-brand-primary/10 text-brand-primary text-[11px] font-semibold hover:bg-brand-primary/20 transition-colors cursor-pointer"
              >
                {variable.label}
              </button>
            ))}
          </div>

          {/* Vista previa de cómo se verá el bloque: el mismo resolvedor que usa el
              servidor para el PDF, con datos de ejemplo. Así el docente no tiene
              que generar un certificado para saber si el texto cabe. */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Vista previa
            </p>
            <p
              className="text-sm whitespace-pre-wrap"
              style={{
                textAlign:
                  elemento.alineacion === 'centro'
                    ? 'center'
                    : elemento.alineacion === 'derecha'
                      ? 'right'
                      : 'left',
                color: elemento.color,
              }}
            >
              {onResolverEjemplo(elemento.texto)}
            </p>
          </div>
        </>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">
            Alineación
          </label>
          <div className="flex gap-1.5">
            {ALINEACIONES.map((opcion) => (
              <button
                key={opcion.value}
                type="button"
                onClick={() => onCambiar({ alineacion: opcion.value })}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  elemento.alineacion === opcion.value
                    ? 'bg-brand-primary text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opcion.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              Tamaño ({elemento.fontSize} pt)
            </label>
            <input
              type="range"
              min={3}
              max={72}
              step={1}
              value={elemento.fontSize}
              onChange={(event) => onCambiar({ fontSize: Number(event.target.value) })}
              className="w-full accent-brand-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">Color</label>
            <input
              type="color"
              value={elemento.color}
              onChange={(event) => onCambiar({ color: event.target.value })}
              className="w-full h-9 rounded-lg border border-gray-200 cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">Fuente</label>
          <select
            value={elemento.fontFamily}
            onChange={(event) => onCambiar({ fontFamily: event.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-mid cursor-pointer"
          >
            {FUENTES.map((fuente) => (
              <option key={fuente} value={fuente}>
                {fuente}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">
            Ancho del bloque ({Math.round(elemento.anchoPercent / 100)}%)
          </label>
          <input
            type="range"
            min={1000}
            max={9000}
            step={100}
            value={elemento.anchoPercent}
            onChange={(event) =>
              onCambiar({ anchoPercent: Number(event.target.value) })
            }
            className="w-full accent-brand-primary"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Define hasta dónde llega el texto antes de pasar a la línea siguiente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ElementPropsPanel;
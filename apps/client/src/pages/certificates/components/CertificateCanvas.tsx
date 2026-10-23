// apps/client/src/pages/certificates/components/CertificateCanvas.tsx
// Lienzo del diagramador (HU-02).
//
// Las coordenadas se guardan en porcentajes, no en píxeles: así el mismo diseño
// sirve aunque la imagen se muestre a otro tamaño en pantalla, y el servidor
// puede escalar todo a la página del PDF.
//
// El bloque de texto nace centrado sobre el punto del clic y se dibuja con
// `translate(-50%, -50%)`: crece hacia ambos lados, que es exactamente lo que
// hace pdfkit al alinear al centro. Si el navegador y el PDF centraran distinto,
// el diseño se vería bien aquí y saldría corrido en el papel.

import { useCallback, useRef, useState } from 'react';
import { CERTIFICATE_PERCENT_SCALE } from 'shared';

export interface ElementoBorrador {
  // Los elementos ya guardados traen su id. Los nuevos reciben uno negativo
  // temporal para poder distinguirlos en el lienzo y en la selección.
  id: number;
  tipo: 'texto';
  texto: string;
  xPercent: number;
  yPercent: number;
  anchoPercent: number;
  alineacion: 'izquierda' | 'centro' | 'derecha';
  fontSize: number;
  fontFamily: string;
  color: string;
  position: number;
}

export const nuevoIdTemporal = (): number =>
  -Date.now() - Math.round(Math.random() * 1000);

/** Acota un valor al rango válido de porcentajes, en centésimas. */
export const acotarPercent = (valor: number): number =>
  Math.min(CERTIFICATE_PERCENT_SCALE, Math.max(0, Math.round(valor)));

// Un certificado mide 792 pt de ancho. Mostrado a unos 300 px, un cuerpo de 18 pt
// equivaldría a poco más de 7 px, ilegible en pantalla; este factor lo lleva a un
// tamaño cómodo sin exagerarlo. Solo afecta a la vista previa: el PDF usa el
// tamaño real en puntos.
const FACTOR_VISUAL = 3.2;

interface CertificateCanvasProps {
  fondoUrl: string;
  elementos: ElementoBorrador[];
  seleccionado: number | null;
  onSeleccionar: (id: number | null) => void;
  onAgregarTexto: (xPercent: number, yPercent: number) => void;
  onMover: (id: number, xPercent: number, yPercent: number) => void;
  onEliminar: (id: number) => void;
}

const CertificateCanvas = ({
  fondoUrl,
  elementos,
  seleccionado,
  onSeleccionar,
  onAgregarTexto,
  onMover,
  onEliminar,
}: CertificateCanvasProps) => {
  const contenedor = useRef<HTMLDivElement>(null);
  const [arrastrando, setArrastrando] = useState<{
    id: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Coordenadas del puntero en centésimas de porcentaje, relativas al fondo. El
  // rectángulo del contenedor sirve de referencia, así que el resultado no depende
  // de que la imagen ocupe todo el ancho disponible.
  const aPorcentaje = useCallback((clientX: number, clientY: number) => {
    const caja = contenedor.current?.getBoundingClientRect();

    if (!caja) return null;

    return {
      x: ((clientX - caja.left) / caja.width) * CERTIFICATE_PERCENT_SCALE,
      y: ((clientY - caja.top) / caja.height) * CERTIFICATE_PERCENT_SCALE,
    };
  }, []);

  const handleClickEnFondo = (event: React.MouseEvent) => {
    // Un clic sobre un elemento no crea texto ni deselecciona: la selección se
    // gestiona en el mousedown del propio bloque. Solo el fondo vacío crea texto.
    if (event.target !== event.currentTarget) return;

    const punto = aPorcentaje(event.clientX, event.clientY);

    if (punto) onAgregarTexto(acotarPercent(punto.x), acotarPercent(punto.y));
  };

  const handleMouseDown = (event: React.MouseEvent, id: number) => {
    const punto = aPorcentaje(event.clientX, event.clientY);

    if (!punto) return;

    const elemento = elementos.find((item) => item.id === id);

    if (!elemento) return;

    // Se guarda el desfase entre el puntero y el bloque para que al arrastrar no
    // salte el elemento al centro del cursor.
    setArrastrando({
      id,
      offsetX: punto.x - elemento.xPercent,
      offsetY: punto.y - elemento.yPercent,
    });
    onSeleccionar(id);

    event.preventDefault();
    event.stopPropagation();
  };

  // El arrastre se sigue sobre la ventana y no sobre el bloque: si el cursor sale
  // del elemento a media soltada, el movimiento debe continuar.
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!arrastrando) return;

    const punto = aPorcentaje(event.clientX, event.clientY);

    if (!punto) return;

    onMover(
      arrastrando.id,
      acotarPercent(punto.x - arrastrando.offsetX),
      acotarPercent(punto.y - arrastrando.offsetY)
    );
  };

  const handleMouseUp = () => setArrastrando(null);

  return (
    <div className="bg-gray-100 rounded-2xl border border-gray-200 p-4">
      <div
        ref={contenedor}
        onClick={handleClickEnFondo}
        onContextMenu={(event) => event.preventDefault()}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative w-full select-none shadow-sm"
        style={{ aspectRatio: '4 / 3', cursor: 'crosshair' }}
      >
        <img
          src={fondoUrl}
          alt="Imagen base del certificado"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
        />

        {elementos.map((elemento) => {
          return (
            <div
              key={elemento.id}
              onMouseDown={(event) => handleMouseDown(event, elemento.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                onSeleccionar(elemento.id);
              }}
              className={`absolute cursor-move ${
                seleccionado === elemento.id ? 'ring-2 ring-brand-primary rounded' : ''
              }`}
              style={{
                left: `${(elemento.xPercent / CERTIFICATE_PERCENT_SCALE) * 100}%`,
                top: `${(elemento.yPercent / CERTIFICATE_PERCENT_SCALE) * 100}%`,
                width: `${(elemento.anchoPercent / CERTIFICATE_PERCENT_SCALE) * 100}%`,
                // El desplazamiento es lo que hace crecer el bloque hacia ambos
                // lados: sin él, el borde izquierdo coincidiría con el punto.
                transform: 'translate(-50%, -50%)',
                textAlign:
                  elemento.alineacion === 'centro'
                    ? 'center'
                    : elemento.alineacion === 'derecha'
                      ? 'right'
                      : 'left',
                fontSize: `${elemento.fontSize * FACTOR_VISUAL}px`,
                fontFamily: elemento.fontFamily,
                color: elemento.color,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              <span className="pointer-events-none whitespace-pre-wrap">{elemento.texto}</span>

              {seleccionado === elemento.id && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEliminar(elemento.id);
                  }}
                  className="absolute -top-6 right-0 bg-red-500 text-white text-xs w-5 h-5 rounded-full leading-none hover:bg-red-600 cursor-pointer"
                  title="Eliminar elemento"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Haga clic en el fondo para añadir un bloque de texto centrado, y arrastre cualquier
        elemento para moverlo.
      </p>
    </div>
  );
};

export default CertificateCanvas;
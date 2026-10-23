// apps/client/src/pages/certificates/components/CertificatePreview.tsx
// Vista previa del certificado (issue #97, #98).
//
// No es un lienzo editable: el texto, su posición y su tipografía son fijos y
// salen de `buildCertificateBlocks`, el mismo helper que usa el render del PDF.
// Todas las medidas están en puntos de la página carta (792x612) y se escalan por
// el ancho real en pantalla, así que lo que se ve aquí es lo que sale impreso.

import { useEffect, useRef, useState } from 'react';
import {
  CERTIFICATE_AUTORIDADES_LAYOUT,
  CERTIFICATE_CONTENT_WIDTH,
  CERTIFICATE_CONTENT_X,
  CERTIFICATE_FONT_CSS,
  CERTIFICATE_PAGE_HEIGHT,
  CERTIFICATE_PAGE_WIDTH,
  CERTIFICATE_QR_LAYOUT,
  CERTIFICATE_SAMPLE_CODE,
  buildCertificateBlocks,
  fitCertificateFontSize,
  type CertificateData,
} from 'shared';

interface CertificatePreviewProps {
  fondoUrl: string;
  datos: CertificateData;
  autoridades: { titulo: string; nombre: string }[];
}

const PROPORCION_PAGINA = `${CERTIFICATE_PAGE_WIDTH} / ${CERTIFICATE_PAGE_HEIGHT}`;

// Mide en puntos de la página (1 px de canvas = 1 pt): el ajuste del tamaño de
// letra de las autoridades da el mismo resultado que en el PDF.
let contextoMedicion: CanvasRenderingContext2D | null = null;

const medirTexto = (texto: string, tamano: number, negrita: boolean): number => {
  contextoMedicion ??= document.createElement('canvas').getContext('2d');
  if (!contextoMedicion) return 0;
  contextoMedicion.font = `${negrita ? 700 : 400} ${tamano}px ${CERTIFICATE_FONT_CSS.Helvetica.family}`;
  return contextoMedicion.measureText(texto).width;
};

const CertificatePreview = ({ fondoUrl, datos, autoridades }: CertificatePreviewProps) => {
  const contenedor = useRef<HTMLDivElement>(null);
  const [anchoPagina, setAnchoPagina] = useState(0);

  useEffect(() => {
    const caja = contenedor.current;
    if (!caja) return;

    const observador = new ResizeObserver(([entrada]) => {
      setAnchoPagina(entrada.contentRect.width);
    });
    observador.observe(caja);

    return () => observador.disconnect();
  }, []);

  // Píxeles de pantalla por punto del PDF.
  const escala = anchoPagina / CERTIFICATE_PAGE_WIDTH;

  // Mismo filtro y reparto que `dibujarAutoridades` en el servidor.
  const firmantes = autoridades.filter((autoridad) => autoridad.nombre.trim() !== '');
  const banda = CERTIFICATE_AUTORIDADES_LAYOUT;
  const anchoFirmante = (banda.limiteDerecho - banda.margenX) / Math.max(firmantes.length, 1);
  const anchoTextoFirmante = anchoFirmante - banda.padding * 2;
  const ajustar = (texto: string, tamanoBase: number, negrita: boolean) =>
    fitCertificateFontSize(texto, anchoTextoFirmante, tamanoBase, (t, tamano) =>
      medirTexto(t, tamano, negrita)
    );
  const qr = CERTIFICATE_QR_LAYOUT;

  return (
    <div className="bg-gray-100 rounded-2xl border border-gray-200 p-4">
      <div
        ref={contenedor}
        className="relative w-full select-none shadow-sm overflow-hidden bg-white"
        style={{ aspectRatio: PROPORCION_PAGINA }}
      >
        {/* El PDF encaja el fondo sin deformarlo; `object-contain` hace lo mismo. */}
        <img
          src={fondoUrl}
          alt="Imagen base del certificado"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
        />

        {buildCertificateBlocks(datos).map((bloque) => (
          <div
            key={bloque.y}
            className="absolute text-center"
            style={{
              left: CERTIFICATE_CONTENT_X * escala,
              top: bloque.y * escala,
              width: CERTIFICATE_CONTENT_WIDTH * escala,
              fontSize: bloque.fontSize * escala,
              fontFamily: CERTIFICATE_FONT_CSS[bloque.font].family,
              fontWeight: CERTIFICATE_FONT_CSS[bloque.font].weight,
              color: bloque.color,
              lineHeight: 1.15,
            }}
          >
            {bloque.texto}
          </div>
        ))}

        {firmantes.map((autoridad, indice) => {
          const x = banda.margenX + anchoFirmante * indice;
          const anchoLinea = anchoFirmante * banda.lineaAncho;

          return (
            <div key={indice}>
              <div
                className="absolute bg-gray-700"
                style={{
                  left: (x + (anchoFirmante - anchoLinea) / 2) * escala,
                  top: (banda.bandaY - banda.lineaY) * escala,
                  width: anchoLinea * escala,
                  height: Math.max(0.75 * escala, 1),
                }}
              />
              <div
                className="absolute text-center whitespace-nowrap"
                style={{
                  left: (x + banda.padding) * escala,
                  top: banda.bandaY * escala,
                  width: anchoTextoFirmante * escala,
                  fontFamily: CERTIFICATE_FONT_CSS.Helvetica.family,
                  lineHeight: 1,
                }}
              >
                <div
                  className="font-bold text-gray-900"
                  style={{ fontSize: ajustar(autoridad.nombre, banda.nombreFontSize, true) * escala }}
                >
                  {autoridad.nombre}
                </div>
                <div
                  className="absolute inset-x-0 text-gray-600"
                  style={{
                    top: banda.separacionY * escala,
                    fontSize: ajustar(autoridad.titulo, banda.tituloFontSize, false) * escala,
                  }}
                >
                  {autoridad.titulo}
                </div>
              </div>
            </div>
          );
        })}

        {/* Mismo QR fijo que imprime el PDF; el código es de ejemplo. */}
        <img
          src={`${import.meta.env.BASE_URL}qr-verificacion.png`}
          alt="QR de verificación"
          className="absolute pointer-events-none"
          draggable={false}
          style={{
            left: (CERTIFICATE_PAGE_WIDTH - qr.size - qr.margen) * escala,
            top: (CERTIFICATE_PAGE_HEIGHT - qr.size - qr.margen) * escala,
            width: qr.size * escala,
            height: qr.size * escala,
          }}
        />
        <div
          className="absolute text-center font-bold text-gray-900 whitespace-nowrap"
          style={{
            left: (CERTIFICATE_PAGE_WIDTH - qr.size - qr.margen - 20) * escala,
            top: (CERTIFICATE_PAGE_HEIGHT - qr.margen + 3) * escala,
            width: (qr.size + 40) * escala,
            fontSize: qr.codigoFontSize * escala,
            fontFamily: CERTIFICATE_FONT_CSS.Helvetica.family,
            lineHeight: 1,
          }}
        >
          {CERTIFICATE_SAMPLE_CODE}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Vista previa. Los datos del estudiante o instructor, del curso y el código de verificación
        se completan automáticamente al generar los certificados.
      </p>
    </div>
  );
};

export default CertificatePreview;

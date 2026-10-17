// apps/server/src/services/certificado.render.ts
// Render de un certificado a PDF (HU-04).
//
// La página es carta horizontal (11 x 8.5 pulgadas = 792 x 612 pt), que es el
// tamaño que se imprime en la mayoría de las impresoras de escritorio sin
// dejar márgenes.
//
// El texto se dibuja como texto de pdfkit, no como imagen: al imprimir sale
// nítido a cualquier escala y el archivo pesa poco. Solo el fondo y las firmas
// son imágenes.

import { createWriteStream } from 'node:fs';
import PDFDocument from 'pdfkit';
import {
  CERTIFICATE_PAGE_HEIGHT,
  CERTIFICATE_PAGE_WIDTH,
  CERTIFICATE_PERCENT_SCALE,
  resolveCertificateVariables,
  type CertificateVariableContext,
  type PlantillaElementoView,
} from 'shared';
import { resolveUploadPath } from './imagen.service.js';

// Alto por defecto de una firma, en centésimas de porcentaje. Las firmas se
// digitalizan como franjas horizontales bajas (firma y rúbrica), así que un 20%
// de la altura de la página las contiene sin deformarse.
const FIRMA_ALTO_POR_DEFECTO = 2000;

// Alto de la firma cuando el ancho pedido es mayor que el que la propia firma
// permite mantener sin estirarla.
const FIRMA_ANCHO_MAXIMO = 4000;

interface RenderOpciones {
  destino: string;
  fondoRuta: string;
  // Proporción real del fondo, para decidir si entra estirado o centrado.
  fondoAncho: number;
  fondoAlto: number;
  elementos: PlantillaElementoView[];
  contexto: CertificateVariableContext;
}

/** Convierte un porcentaje en centésimas a puntos de la página. */
const aPuntos = (centesimas: number, lado: number): number =>
  (centesimas / CERTIFICATE_PERCENT_SCALE) * lado;

/**
 * Los tipos de `@types/pdfkit` declaran menos alineaciones que las que pdfkit
 * acepta en la práctica: a `align` le falta "left" y a `valign` le falta "top",
 * que son justamente las que necesita una firma pegada a una esquina. Se tipa el
 * objeto con la forma que realmente se le pasa en vez de renunciar al
 * posicionamiento y dejar todo centrado.
 */
type OpcionesImagen = Parameters<PDFKit.PDFDocument['image']>[1];

/** Traduce la alineación del dominio a la de pdfkit. */
const aAlignPdfkit = (alineacion: PlantillaElementoView['alineacion']) => {
  if (alineacion === 'izquierda') return 'left';
  if (alineacion === 'derecha') return 'right';
  return 'center';
};

/**
 * Una imagen base con otra proporción que la carta no se estira: estirar
 * deformaría el diseño y los bordes decorativos quedarían inclinados. Se ajusta
 * al lado que manda y se centra, que es lo mismo que un "contain".
 */
const dibujarFondo = (doc: PDFKit.PDFDocument, opciones: RenderOpciones) => {
  const proporcionFondo = opciones.fondoAncho / opciones.fondoAlto;
  const proporcionPagina = CERTIFICATE_PAGE_WIDTH / CERTIFICATE_PAGE_HEIGHT;

  let width = CERTIFICATE_PAGE_WIDTH;
  let height = CERTIFICATE_PAGE_HEIGHT;
  let x = 0;
  let y = 0;

  if (proporcionFondo > proporcionPagina) {
    // El fondo es más ancho que la página: manda el ancho y sobra alto.
    height = CERTIFICATE_PAGE_WIDTH / proporcionFondo;
    y = (CERTIFICATE_PAGE_HEIGHT - height) / 2;
  } else {
    // El fondo es más alto: manda el alto y sobra ancho.
    width = CERTIFICATE_PAGE_HEIGHT * proporcionFondo;
    x = (CERTIFICATE_PAGE_WIDTH - width) / 2;
  }

  doc.image(resolveUploadPath(opciones.fondoRuta), x, y, { width, height });
};

/**
 * Dibuja un bloque de texto. La alineación decide hacia dónde crece el bloque:
 * centrado crece hacia ambos lados desde la x del elemento, que es el mismo
 * comportamiento que el diagrador del navegador. Si el cliente y el servidor
 * alinearan distinto, el diseño se vería bien en pantalla y saldría corrido en el
 * papel.
 */
const dibujarTexto = (
  doc: PDFKit.PDFDocument,
  elemento: PlantillaElementoView,
  contexto: CertificateVariableContext
) => {
  const contenido = resolveCertificateVariables(elemento.texto ?? '', contexto);

  doc.font(elemento.fontFamily);
  doc.fontSize(elemento.fontSize);
  doc.fillColor(elemento.color);

  const x = aPuntos(elemento.xPercent, CERTIFICATE_PAGE_WIDTH);
  const y = aPuntos(elemento.yPercent, CERTIFICATE_PAGE_HEIGHT);
  const ancho = aPuntos(elemento.anchoPercent, CERTIFICATE_PAGE_WIDTH);

  // `baseline: 'top'` hace que `y` sea el borde superior de la primera línea, que
  // es como el lienzo del editor lo posiciona; sin eso el texto quedaría medio
  // renglón más abajo de donde el usuario lo puso.
  doc.text(contenido, x, y, {
    width: ancho,
    align: aAlignPdfkit(elemento.alineacion),
    lineBreak: true,
    baseline: 'top',
  });
};

const dibujarFirma = (doc: PDFKit.PDFDocument, elemento: PlantillaElementoView) => {
  if (!elemento.firma) return;

  const x = aPuntos(elemento.xPercent, CERTIFICATE_PAGE_WIDTH);
  const y = aPuntos(elemento.yPercent, CERTIFICATE_PAGE_HEIGHT);

  const anchoPedido = aPuntos(elemento.anchoPercent, CERTIFICATE_PAGE_WIDTH);
  const altoPedido = aPuntos(FIRMA_ALTO_POR_DEFECTO, CERTIFICATE_PAGE_HEIGHT);

  // El ancho se limita porque `fit` de pdfkit sí deforma si se le da una caja
  // que no acompaña la proporción de la firma; una firma panorámica no puede
  // estirarse hasta el ancho de la página.
  const ancho = Math.min(anchoPedido, aPuntos(FIRMA_ANCHO_MAXIMO, CERTIFICATE_PAGE_WIDTH));

  try {
    // `align` decide hacia dónde crece la firma dentro de su caja y `valign:
    // 'top'` la pega al borde superior, que es la `y` que el usuario eligió.
    const opciones = {
      fit: [ancho, altoPedido] as [number, number],
      align: aAlignPdfkit(elemento.alineacion),
      valign: 'top',
    } as unknown as OpcionesImagen;

    doc.image(resolveUploadPath(elemento.firma.ruta), x, y, opciones);
  } catch {
    // Si el archivo de la firma ya no está en disco, el certificado se emite sin
    // ella en lugar de abortar todo el lote. La plantilla ya no puede usar una
    // firma borrada (el servicio lo impide), así que esto solo cubre el caso de
    // un archivo perdido manualmente.
  }
};

/**
 * Escribe un certificado completo en el disco y resuelve cuando el PDF está
 * terminado. El job que llama a esto espera la promesa para poder contar los
 * procesados con seguridad.
 */
export const renderizarCertificado = async (opciones: RenderOpciones): Promise<void> => {
  const doc = new PDFDocument({
    size: [CERTIFICATE_PAGE_WIDTH, CERTIFICATE_PAGE_HEIGHT],
    // Sin margen: el fondo se imprime de borde a borde y el texto se posiciona
    // con coordenadas exactas, no con el padding por defecto de pdfkit.
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    // La metadata queda en el PDF aunque no se muestre en pantalla: sirve para
    // saber cuándo se generó cada documento.
    info: {
      Title: 'Certificado de participación',
      Producer: 'AdmCursosUMSS',
      Creator: 'AdmCursosUMSS',
    },
  });

  const stream = createWriteStream(opciones.destino);

  await new Promise<void>((resolve, reject) => {
    doc.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);

    dibujarFondo(doc, opciones);

    // El orden de dibujo es el `position` que el cliente guardó: lo último queda
    // encima, igual que en el diagramador.
    const ordenados = [...opciones.elementos].sort((a, b) => a.position - b.position);

    for (const elemento of ordenados) {
      if (elemento.tipo === 'texto') {
        dibujarTexto(doc, elemento, opciones.contexto);
      } else {
        dibujarFirma(doc, elemento);
      }
    }

    doc.end();
  });
};
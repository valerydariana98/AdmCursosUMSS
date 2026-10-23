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
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import {
  CERTIFICATE_PAGE_HEIGHT,
  CERTIFICATE_PAGE_WIDTH,
  CERTIFICATE_PERCENT_SCALE,
  resolveCertificateVariables,
  type CertificateVariableContext,
  type PlantillaAutoridad,
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

// Banda inferior reservada a las autoridades (issue #97, #99, #102). Se dibujan
// en una fila repartida sobre el ancho útil, sin invadir la esquina inferior
// derecha, que es donde va el QR (ver `dibujarPagina`).
const AUTORIDADES_BANDA_Y = 470;
const AUTORIDADES_MARGEN_X = 60;
// El QR ocupa ~72pt a 24pt del borde derecho; la fila de autoridades se corta
// antes para no solaparse con él.
const AUTORIDADES_LIMITE_DERECHO = 640;
const AUTORIDADES_SEPARACION_Y = 18;

interface RenderOpciones {
  destino?: string;
  fondoRuta: string;
  // ProporciA3n real del fondo, para decidir si entra estirado o centrado.
  fondoAncho: number;
  fondoAlto: number;
  elementos: PlantillaElementoView[];
  contexto: CertificateVariableContext;
  // Autoridades firmantes de la plantilla (título + nombre). Se guardan en
  // `plantilla_autoridades` sin coordenadas porque su posición es fija por
  // diseño: la estructura del certificado no la mueve el usuario.
  autoridades?: PlantillaAutoridad[];
  codigoVerificacion?: string;
  qrBuffer?: Buffer;
}

interface RenderPaginaOpciones extends Omit<RenderOpciones, 'destino'> {}

/** Convierte un porcentaje en centésimas a puntos de la página. */
const aPuntos = (centesimas: number, lado: number): number =>
  (centesimas / CERTIFICATE_PERCENT_SCALE) * lado;

// PDFKit solo entiende PNG y JPEG al insertar una imagen, pero `imagen.service`
// guarda los fondos y las firmas convertidos a WebP para que el navegador los
// pese menos. Sin esta conversión, `doc.image()` falla con "Unknown image
// format" y el job de generación aborta. Se cachea por ruta: en un lote de 30
// certificados el mismo fondo se reutiliza en todas las páginas y convertirlo
// una sola vez evita repetir el trabajo de sharp.
const imagenesPdfCache = new Map<string, Promise<Buffer>>();

const cargarImagenPdf = (rutaAbsoluta: string): Promise<Buffer> => {
  const enCache = imagenesPdfCache.get(rutaAbsoluta);
  if (enCache) return enCache;

  const promesa = (async () => {
    const original = await readFile(rutaAbsoluta);
    const extension = path.extname(rutaAbsoluta).toLowerCase();

    // PNG y JPEG los lee pdfkit tal cual; el resto (WebP, TIFF, AVIF…) pasa por
    // sharp para normalizarlo a PNG.
    if (extension === '.png' || extension === '.jpg' || extension === '.jpeg') {
      return original;
    }

    return sharp(original).png().toBuffer();
  })();

  imagenesPdfCache.set(rutaAbsoluta, promesa);
  return promesa;
};

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
const dibujarFondo = async (doc: PDFKit.PDFDocument, opciones: RenderOpciones) => {
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

  const imagen = await cargarImagenPdf(resolveUploadPath(opciones.fondoRuta));
  doc.image(imagen, x, y, { width, height });
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

const dibujarFirma = async (doc: PDFKit.PDFDocument, elemento: PlantillaElementoView) => {
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

    const imagen = await cargarImagenPdf(resolveUploadPath(elemento.firma.ruta));
    doc.image(imagen, x, y, opciones);
  } catch {
    // Si el archivo de la firma ya no está en disco, el certificado se emite sin
    // ella en lugar de abortar todo el lote. La plantilla ya no puede usar una
    // firma borrada (el servicio lo impide), así que esto solo cubre el caso de
    // un archivo perdido manualmente.
  }
};

/**
 * Dibuja las autoridades firmantes en la banda inferior: una fila repartida con
 * el nombre en negrita y, debajo, el cargo o título. Van en una posición fija
 * porque la tabla `plantilla_autoridades` no guarda coordenadas (issue #97,
 * #99, #102): la estructura de firmas es parte del diseño, no algo que el
 * usuario reubica en el lienzo.
 */
const dibujarAutoridades = (doc: PDFKit.PDFDocument, autoridades: PlantillaAutoridad[]) => {
  const firmantes = autoridades.filter((a) => a.nombre.trim() !== '');
  if (firmantes.length === 0) return;

  const anchoTotal = AUTORIDADES_LIMITE_DERECHO - AUTORIDADES_MARGEN_X;
  const anchoBloque = anchoTotal / firmantes.length;

  firmantes.forEach((autoridad, indice) => {
    const x = AUTORIDADES_MARGEN_X + anchoBloque * indice;

    doc.font('Helvetica-Bold').fontSize(13).fillColor('#111827');
    doc.text(autoridad.nombre, x, AUTORIDADES_BANDA_Y, {
      width: anchoBloque,
      align: 'center',
      lineBreak: false,
      baseline: 'top',
    });

    doc.font('Helvetica').fontSize(9).fillColor('#4B5563');
    doc.text(autoridad.titulo, x, AUTORIDADES_BANDA_Y + AUTORIDADES_SEPARACION_Y, {
      width: anchoBloque,
      align: 'center',
      lineBreak: false,
      baseline: 'top',
    });
  });
};

/**
 * Escribe un certificado completo en el disco y resuelve cuando el PDF está
 * terminado. El job que llama a esto espera la promesa para poder contar los
 * procesados con seguridad.
 */
const dibujarPagina = async (doc: PDFKit.PDFDocument, opciones: RenderPaginaOpciones) => {
  await dibujarFondo(doc, opciones as RenderOpciones);

  const ordenados = [...opciones.elementos].sort((a, b) => a.position - b.position);

  for (const elemento of ordenados) {
    if (elemento.tipo === 'texto') {
      dibujarTexto(doc, elemento, opciones.contexto);
    } else {
      await dibujarFirma(doc, elemento);
    }
  }

  if (opciones.autoridades?.length) {
    dibujarAutoridades(doc, opciones.autoridades);
  }

  // QR y codigo de verificacion en la parte inferior (issue #98, #100).
  if (opciones.qrBuffer) {
    const qrSize = 72;
    const x = CERTIFICATE_PAGE_WIDTH - qrSize - 24;
    const y = CERTIFICATE_PAGE_HEIGHT - qrSize - 24;
    doc.image(opciones.qrBuffer, x, y, { width: qrSize, height: qrSize });

    if (opciones.codigoVerificacion) {
      doc.fontSize(8).fillColor('#374151').text(opciones.codigoVerificacion, x - 40, y + qrSize + 4, {
        width: qrSize + 80,
        align: 'center',
      });
    }
  }
};

export const renderizarCertificado = async (opciones: RenderOpciones): Promise<void> => {
  if (!opciones.destino) throw new Error('destino requerido');

  const doc = new PDFDocument({
    size: [CERTIFICATE_PAGE_WIDTH, CERTIFICATE_PAGE_HEIGHT],
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    info: {
      Title: 'Certificado de participacion',
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

    // El dibujo es async (convierte las imágenes WebP a PNG antes de pasarlas a
    // pdfkit), así que hay que esperarlo antes de cerrar el documento.
    dibujarPagina(doc, opciones)
      .then(() => doc.end())
      .catch(reject);
  });
};

export const renderizarCertificadosEnPdf = async (
  destino: string,
  paginas: RenderPaginaOpciones[]
): Promise<void> => {
  const doc = new PDFDocument({
    size: [CERTIFICATE_PAGE_WIDTH, CERTIFICATE_PAGE_HEIGHT],
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    info: {
      Title: 'Certificados',
      Producer: 'AdmCursosUMSS',
      Creator: 'AdmCursosUMSS',
    },
  });

  const stream = createWriteStream(destino);

  await new Promise<void>((resolve, reject) => {
    doc.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);

    // Cada página dibuja sus imágenes de forma async, así que hay que dibujar
    // secuencial antes de cerrar el documento.
    (async () => {
      for (const [index, pagina] of paginas.entries()) {
        if (index > 0) doc.addPage();
        await dibujarPagina(doc, pagina);
      }
      doc.end();
    })().catch(reject);
  });
};
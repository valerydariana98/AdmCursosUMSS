// apps/server/src/services/certificado.render.ts
// Render de un certificado a PDF (HU-04).
//
// La página es carta horizontal (11 x 8.5 pulgadas = 792 x 612 pt), que es el
// tamaño que se imprime en la mayoría de las impresoras de escritorio sin
// dejar márgenes.
//
// El texto se dibuja como texto de pdfkit, no como imagen: al imprimir sale
// nítido a cualquier escala y el archivo pesa poco. Solo el fondo es imagen.

import { createWriteStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import {
  CERTIFICATE_AUTORIDADES_LAYOUT,
  CERTIFICATE_CONTENT_WIDTH,
  CERTIFICATE_CONTENT_X,
  CERTIFICATE_PAGE_HEIGHT,
  CERTIFICATE_PAGE_WIDTH,
  CERTIFICATE_QR_LAYOUT,
  buildCertificateBlocks,
  fitCertificateFontSize,
  type CertificateData,
  type PlantillaAutoridad,
} from 'shared';
import { resolveUploadPath } from './imagen.service.js';

const AUTORIDADES = CERTIFICATE_AUTORIDADES_LAYOUT;

interface RenderOpciones {
  destino?: string;
  fondoRuta: string;
  // Proporción real del fondo, para decidir si entra estirado o centrado.
  fondoAncho: number;
  fondoAlto: number;
  // Datos del destinatario y del curso. El texto y su posición son fijos
  // (`buildCertificateBlocks`): la plantilla solo aporta fondo y autoridades.
  datos: CertificateData;
  // Autoridades firmantes de la plantilla (título + nombre). Se guardan en
  // `plantilla_autoridades` sin coordenadas porque su posición es fija por
  // diseño: la estructura del certificado no la mueve el usuario.
  autoridades?: PlantillaAutoridad[];
  codigoVerificacion?: string;
  qrBuffer?: Buffer;
}

interface RenderPaginaOpciones extends Omit<RenderOpciones, 'destino'> {}

// PDFKit solo entiende PNG y JPEG al insertar una imagen, pero `imagen.service`
// guarda los fondos convertidos a WebP para que el navegador los pese menos. Sin
// esta conversión, `doc.image()` falla con "Unknown image format" y el job de
// generación aborta. Se cachea por ruta: en un lote de 30 certificados el mismo
// fondo se reutiliza en todas las páginas y convertirlo una sola vez evita
// repetir el trabajo de sharp.
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
 * Dibuja el contenido fijo del certificado. Cada bloque va centrado en la
 * columna de contenido; el editor del cliente dibuja los mismos bloques con las
 * mismas medidas, así que lo que se ve allí es lo que sale impreso.
 */
const dibujarContenido = (doc: PDFKit.PDFDocument, datos: CertificateData) => {
  for (const bloque of buildCertificateBlocks(datos)) {
    doc.font(bloque.font).fontSize(bloque.fontSize).fillColor(bloque.color);

    // `baseline: 'top'` hace que `y` sea el borde superior de la primera línea,
    // que es como el editor posiciona el mismo bloque.
    doc.text(bloque.texto, CERTIFICATE_CONTENT_X, bloque.y, {
      width: CERTIFICATE_CONTENT_WIDTH,
      align: 'center',
      lineBreak: true,
      baseline: 'top',
    });
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

  const anchoTotal = AUTORIDADES.limiteDerecho - AUTORIDADES.margenX;
  const anchoBloque = anchoTotal / firmantes.length;
  const anchoTexto = anchoBloque - AUTORIDADES.padding * 2;

  // Escribe una línea sin dejar que salte: si no entra, achica la letra.
  const escribir = (texto: string, fuente: string, tamanoBase: number, x: number, y: number) => {
    doc.font(fuente);
    const tamano = fitCertificateFontSize(texto, anchoTexto, tamanoBase, (t, size) =>
      doc.fontSize(size).widthOfString(t)
    );
    doc.fontSize(tamano).text(texto, x + AUTORIDADES.padding, y, {
      width: anchoTexto,
      align: 'center',
      lineBreak: false,
      baseline: 'top',
    });
  };

  firmantes.forEach((autoridad, indice) => {
    const x = AUTORIDADES.margenX + anchoBloque * indice;

    const anchoLinea = anchoBloque * AUTORIDADES.lineaAncho;
    const inicioLinea = x + (anchoBloque - anchoLinea) / 2;
    const yLinea = AUTORIDADES.bandaY - AUTORIDADES.lineaY;
    doc
      .moveTo(inicioLinea, yLinea)
      .lineTo(inicioLinea + anchoLinea, yLinea)
      .lineWidth(0.75)
      .strokeColor('#374151')
      .stroke();

    doc.fillColor('#111827');
    escribir(autoridad.nombre, 'Helvetica-Bold', AUTORIDADES.nombreFontSize, x, AUTORIDADES.bandaY);

    doc.fillColor('#4B5563');
    escribir(
      autoridad.titulo,
      'Helvetica',
      AUTORIDADES.tituloFontSize,
      x,
      AUTORIDADES.bandaY + AUTORIDADES.separacionY
    );
  });
};

/**
 * Escribe un certificado completo en el disco y resuelve cuando el PDF está
 * terminado. El job que llama a esto espera la promesa para poder contar los
 * procesados con seguridad.
 */
const dibujarPagina = async (doc: PDFKit.PDFDocument, opciones: RenderPaginaOpciones) => {
  await dibujarFondo(doc, opciones as RenderOpciones);

  dibujarContenido(doc, opciones.datos);

  if (opciones.autoridades?.length) {
    dibujarAutoridades(doc, opciones.autoridades);
  }

  // QR y codigo de verificacion en la parte inferior (issue #98, #100).
  if (opciones.qrBuffer) {
    const qrSize = CERTIFICATE_QR_LAYOUT.size;
    const x = CERTIFICATE_PAGE_WIDTH - qrSize - CERTIFICATE_QR_LAYOUT.margen;
    const y = CERTIFICATE_PAGE_HEIGHT - qrSize - CERTIFICATE_QR_LAYOUT.margen;
    doc.image(opciones.qrBuffer, x, y, { width: qrSize, height: qrSize });

    // El código va centrado bajo el QR. Es lo que se escribe en la página de
    // verificación, así que va en negrita para leerlo sin confundir caracteres.
    if (opciones.codigoVerificacion) {
      const margenCodigo = 20;
      doc
        .font('Helvetica-Bold')
        .fontSize(CERTIFICATE_QR_LAYOUT.codigoFontSize)
        .fillColor('#111827')
        .text(opciones.codigoVerificacion, x - margenCodigo, y + qrSize + 3, {
          width: qrSize + margenCodigo * 2,
          align: 'center',
          lineBreak: false,
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
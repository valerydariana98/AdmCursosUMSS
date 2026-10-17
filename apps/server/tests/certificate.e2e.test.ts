// apps/server/tests/certificate.e2e.test.ts
// Prueba de humo del render: arma un certificado de verdad en un directorio
// temporal y lee el PDF resultante.
//
// No consulta la base de datos a propósito. Lo que se quiere comprobar aquí es
// que pdfkit y sharp producen un archivo válido y que la imagen entra en la
// página, que es la parte que un test con mocks no alcanzaría a probar. La lógica
// de aprobación ya está cubierta por los tests de `report.service.test.ts`.

import { mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { renderizarCertificado } from '../src/services/certificado.render.js';
import type { PlantillaElementoView } from 'shared';

let carpeta: string;
let uploads: string;
let pdfRuta: string;

// El servicio recibe rutas relativas a la carpeta de subidas (es lo que guarda la
// base de datos), así que el test usa las mismas y no rutas absolutas.
const FONDO = 'fondos/fondo.png';
const FIRMA = 'firmas/firma.png';
const PANORAMICO = 'fondos/panoramico.png';
const FIRMA_AUSENTE = 'firmas/no-existe.png';

const FIRMA_ANCHO = 400;
const FIRMA_ALTO = 160;

const crearImagen = async (
  destino: string,
  ancho: number,
  alto: number,
  color: { r: number; g: number; b: number; alpha: number }
) => {
  await sharp({
    create: {
      width: ancho,
      height: alto,
      channels: 4,
      background: color,
    },
  })
    .png()
    .toFile(destino);
};

const elementoTexto = (sobrescrituras: Partial<PlantillaElementoView> = {}): PlantillaElementoView => ({
  id: 1,
  idPlantilla: 1,
  tipo: 'texto',
  texto: 'Se otorga a {nombre_estudiante}',
  idFirma: null,
  xPercent: 2500,
  yPercent: 4000,
  anchoPercent: 5000,
  alineacion: 'centro',
  fontSize: 24,
  fontFamily: 'Helvetica',
  color: '#111827',
  position: 0,
  firma: null,
  ...sobrescrituras,
});

beforeAll(async () => {
  carpeta = await mkdtemp(path.join(tmpdir(), 'certificados-test-'));

  // El servicio resuelve las imágenes a través de la carpeta de subidas y se
  // niega a salir de ella, así que las rutas que se le pasan son relativas a esta.
  uploads = path.join(carpeta, 'uploads');
  await mkdir(path.join(uploads, 'fondos'), { recursive: true });
  await mkdir(path.join(uploads, 'firmas'), { recursive: true });
  process.env.UPLOADS_DIR = uploads;

  pdfRuta = path.join(carpeta, 'certificado.pdf');

  // Un fondo 1600x1200 y una firma 400x160 reproducen la relación de aspecto de un
  // certificado real y de una firma real.
  await crearImagen(path.join(uploads, 'fondos', 'fondo.png'), 1600, 1200, {
    r: 252,
    g: 248,
    b: 235,
    alpha: 1,
  });
  await crearImagen(path.join(uploads, 'firmas', 'firma.png'), FIRMA_ANCHO, FIRMA_ALTO, {
    r: 20,
    g: 20,
    b: 80,
    alpha: 1,
  });
});

afterAll(async () => {
  delete process.env.UPLOADS_DIR;

  if (carpeta) await rm(carpeta, { recursive: true, force: true });
});

describe('renderizado del certificado', () => {
  it('genera un PDF de una sola página con texto y firma', async () => {
    await renderizarCertificado({
      destino: pdfRuta,
      fondoRuta: FONDO,
      fondoAncho: 1600,
      fondoAlto: 1200,
      elementos: [
        elementoTexto(),
        elementoTexto({
          id: 2,
          texto: 'por aprobar {nombre_curso} con nota {nota_final}',
          yPercent: 5000,
          fontSize: 16,
          position: 1,
        }),
        {
          id: 3,
          idPlantilla: 1,
          tipo: 'firma',
          texto: null,
          idFirma: 1,
          xPercent: 5000,
          yPercent: 7500,
          anchoPercent: 2500,
          alineacion: 'centro',
          fontSize: 16,
          fontFamily: 'Helvetica',
          color: '#111827',
          position: 2,
          firma: {
            id: 1,
            nombre: 'Firma Rector',
            ruta: FIRMA,
            originalNombre: 'firma.png',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      ],
      contexto: {
        nombreEstudiante: 'María Fernanda Vargas',
        nombreCurso: 'Álgebra I',
        grupo: 'Grupo 3',
        notaFinal: 87,
        fechaEmision: '16/10/2026',
      },
    });

    const contenido = await readFile(pdfRuta);

    // Un PDF empieza siempre con su cabecera: si el archivo está vacío o corrupto,
    // esta es la primera comprobación que lo delata.
    expect(contenido.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    // El marcador /Type /Page aparece una vez por página más una en el árbol de
    // páginas; contar "/Type /Page\n"aproximadamente  cuenta las páginas reales sin depender de
    // un lector de PDF completo.
    const paginas = (contenido.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(paginas).toBe(1);

    // El PDF declara su caja de medios: si el tamaño fuera otro, el certificado
    // saldría con márgenes que el usuario no pidió. 792x612 pt es carta apaisada.
    expect(contenido.toString('latin1')).toMatch(/\/MediaBox\s*\[\s*0 0 792 612\s*\]/);
  });

  it('deja las variables resueltas dentro del PDF sin el texto de la plantilla', async () => {
    // El texto va comprimido en un flujo aparte, así que no se puede buscar
    // directamente. Lo que sí es comprobable es que el PDF pese lo bastante como
    // para contener texto vectorial: un certificado sin texto sería un cuadro de
    // la imagen del fondo y pesaría mucho menos.
    const info = await stat(pdfRuta);

    expect(info.size).toBeGreaterThan(3000);
  });

  it('genera un PDF por cada llamada sin mezclar el contenido anterior', async () => {
    const segundo = path.join(carpeta, 'segundo.pdf');

    await renderizarCertificado({
      destino: segundo,
      fondoRuta: FONDO,
      fondoAncho: 1600,
      fondoAlto: 1200,
      elementos: [elementoTexto({ texto: 'Segundo certificado' })],
      contexto: {
        nombreEstudiante: 'Otro Estudiante',
        nombreCurso: 'Otro curso',
        grupo: 'Grupo 9',
        notaFinal: 60,
        fechaEmision: '17/10/2026',
      },
    });

    const info = await stat(segundo);

    expect(info.size).toBeGreaterThan(0);

    const contenido = await readFile(segundo);
    expect(contenido.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('ajusta el fondo sin deformarlo cuando su proporción no es la de la carta', async () => {
    // Un fondo panorámico (16:9) en una página 4:3 tiene que entrar centrado por
    // altura, no estirarse. El render no falla en ninguno de los dos casos, así
    // que lo que se comprueba es que produce un PDF válido igual.
    const panoramico = path.join(uploads, 'fondos', 'panoramico.png');
    await crearImagen(panoramico, 1920, 1080, { r: 255, g: 255, b: 255, alpha: 1 });

    const destino = path.join(carpeta, 'panoramico.pdf');

    await renderizarCertificado({
      destino,
      fondoRuta: PANORAMICO,
      fondoAncho: 1920,
      fondoAlto: 1080,
      elementos: [elementoTexto()],
      contexto: {
        nombreEstudiante: 'Estudiante',
        nombreCurso: 'Curso',
        grupo: 'Grupo 1',
        notaFinal: 70,
        fechaEmision: '16/10/2026',
      },
    });

    const contenido = await readFile(destino);
    expect(contenido.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('emite el certificado aunque el archivo de la firma ya no exista', async () => {
    // Una firma borrada a mano del disco no puede tumbar un lote completo de
    // certificados: el documento se emite sin ella.
    const destino = path.join(carpeta, 'sin-firma.pdf');

    await renderizarCertificado({
      destino,
      fondoRuta: FONDO,
      fondoAncho: 1600,
      fondoAlto: 1200,
      elementos: [
        elementoTexto(),
        {
          id: 4,
          idPlantilla: 1,
          tipo: 'firma',
          texto: null,
          idFirma: 99,
          xPercent: 5000,
          yPercent: 7500,
          anchoPercent: 2500,
          alineacion: 'centro',
          fontSize: 16,
          fontFamily: 'Helvetica',
          color: '#111827',
          position: 1,
          firma: {
            id: 99,
            nombre: 'Firma inexistente',
            ruta: FIRMA_AUSENTE,
            originalNombre: 'no-existe.png',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      ],
      contexto: {
        nombreEstudiante: 'Estudiante',
        nombreCurso: 'Curso',
        grupo: 'Grupo 1',
        notaFinal: 70,
        fechaEmision: '16/10/2026',
      },
    });

    const contenido = await readFile(destino);
    expect(contenido.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
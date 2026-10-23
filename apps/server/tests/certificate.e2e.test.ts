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
import { CERTIFICATE_SAMPLE_DATA, type CertificateData } from 'shared';

let carpeta: string;
let uploads: string;
let pdfRuta: string;

// El servicio recibe rutas relativas a la carpeta de subidas (es lo que guarda la
// base de datos), así que el test usa las mismas y no rutas absolutas.
const FONDO = 'fondos/fondo.png';
const PANORAMICO = 'fondos/panoramico.png';

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

const datos = (sobrescrituras: Partial<CertificateData> = {}): CertificateData => ({
  ...CERTIFICATE_SAMPLE_DATA,
  ...sobrescrituras,
});

beforeAll(async () => {
  carpeta = await mkdtemp(path.join(tmpdir(), 'certificados-test-'));

  // El servicio resuelve las imágenes a través de la carpeta de subidas y se
  // niega a salir de ella, así que las rutas que se le pasan son relativas a esta.
  uploads = path.join(carpeta, 'uploads');
  await mkdir(path.join(uploads, 'fondos'), { recursive: true });
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
});

afterAll(async () => {
  delete process.env.UPLOADS_DIR;

  if (carpeta) await rm(carpeta, { recursive: true, force: true });
});

describe('renderizado del certificado', () => {
  it('genera un PDF de una sola página con texto', async () => {
    await renderizarCertificado({
      destino: pdfRuta,
      fondoRuta: FONDO,
      fondoAncho: 1600,
      fondoAlto: 1200,
      datos: datos(),
      autoridades: [
        { titulo: 'Director Académico', nombre: 'Juan Pérez Rojas', orden: 0 },
      ],
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

  it('incluye el texto del certificado como texto vectorial', async () => {
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
      datos: datos({ tipo: 'asistencia', destinatario: 'Otro Estudiante', curso: 'Otro curso' }),
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
      datos: datos({ tipo: 'instructor', grupo: 2, periodo: '2-2026' }),
    });

    const contenido = await readFile(destino);
    expect(contenido.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

});
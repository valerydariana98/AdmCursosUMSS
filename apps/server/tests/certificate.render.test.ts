// apps/server/tests/certificate.render.test.ts
// Pruebas de las piezas puras del módulo de certificados: el nombre del archivo
// generado y el tamaño de página, que son los dos valores que, si cambian, llegan
// al usuario sin que nadie lo note hasta que ya repartió los diplomas.

import { describe, expect, it } from 'vitest';
import {
  CERTIFICATE_AUTORIDADES_LAYOUT,
  CERTIFICATE_PAGE_HEIGHT,
  CERTIFICATE_PAGE_WIDTH,
  CERTIFICATE_CODE_PATTERN,
  CERTIFICATE_SAMPLE_CODE,
  CERTIFICATE_SAMPLE_DATA,
  buildCertificateBlocks,
  formatCertificateDate,
  formatCertificateMonth,
  normalizeCertificateCode,
  type CertificateData,
} from 'shared';

describe('tamaño de página del certificado', () => {
  it('es carta horizontal, que es lo que se imprime en el sistema', () => {
    // 11 x 8.5 pulgadas a 72 puntos por pulgada.
    expect(CERTIFICATE_PAGE_WIDTH).toBe(792);
    expect(CERTIFICATE_PAGE_HEIGHT).toBe(612);
  });

  it('es más ancha que alta, como todo certificado apaisado', () => {
    expect(CERTIFICATE_PAGE_WIDTH).toBeGreaterThan(CERTIFICATE_PAGE_HEIGHT);
  });
});

describe('formato de fechas del certificado', () => {
  it('escribe la fecha completa en español', () => {
    expect(formatCertificateDate('2026-07-23')).toBe('23 de julio de 2026');
  });

  it('no corre la fecha un día por la zona horaria', () => {
    // `new Date('2026-08-01')` es medianoche UTC, que en Bolivia (UTC-4) todavía
    // es 31 de julio. El formato no debe pasar por Date.
    expect(formatCertificateDate('2026-08-01')).toBe('1 de agosto de 2026');
  });

  it('acepta la fecha con hora que a veces devuelve la base', () => {
    expect(formatCertificateDate('2026-12-05T00:00:00.000Z')).toBe('5 de diciembre de 2026');
  });

  it('escribe mes y año para el lugar y fecha', () => {
    expect(formatCertificateMonth('2026-08-05')).toBe('agosto de 2026');
  });
});

describe('contenido fijo del certificado', () => {
  const datos = (sobrescrituras: Partial<CertificateData> = {}): CertificateData => ({
    ...CERTIFICATE_SAMPLE_DATA,
    ...sobrescrituras,
  });

  const textos = (d: CertificateData) => buildCertificateBlocks(d).map((bloque) => bloque.texto);

  it('pone el nombre del destinatario en mayúsculas', () => {
    expect(textos(datos({ destinatario: 'Scarlet Davila Montaño' }))).toContain(
      'SCARLET DAVILA MONTAÑO'
    );
  });

  it('titula según la condición del estudiante', () => {
    expect(textos(datos({ tipo: 'aprobacion' }))).toContain('DE APROBACIÓN');
    expect(textos(datos({ tipo: 'asistencia' }))).toContain('DE ASISTENCIA');
    expect(textos(datos({ tipo: 'instructor' }))).toContain('DE RECONOCIMIENTO');
  });

  it('describe el curso con sus fechas y horas', () => {
    expect(textos(datos())).toContain(
      'Realizado del 23 de julio de 2026 al 5 de agosto de 2026, con una duración de 30 horas académicas.'
    );
  });

  it('agrega grupo y gestión solo al certificado del instructor', () => {
    const estudiante = textos(datos({ grupo: 2, periodo: '2-2026' })).join(' ');
    const instructor = textos(datos({ tipo: 'instructor', grupo: 2, periodo: '2-2026' })).join(' ');

    expect(estudiante).not.toContain('gestión');
    expect(instructor).toContain('al 5 de agosto de 2026, grupo 2, gestión 2-2026, con una');
  });

  it('pone cada bloque en la misma posición sin importar los datos', () => {
    const posiciones = (d: CertificateData) => buildCertificateBlocks(d).map((bloque) => bloque.y);

    expect(posiciones(datos({ destinatario: 'A', curso: 'B' }))).toEqual(
      posiciones(datos({ tipo: 'instructor', destinatario: 'Otro nombre', curso: 'Otro curso' }))
    );
  });

  it('deja todo el texto dentro de la página y por encima de las autoridades', () => {
    for (const bloque of buildCertificateBlocks(datos())) {
      expect(bloque.y).toBeGreaterThan(0);
      expect(bloque.y).toBeLessThan(CERTIFICATE_AUTORIDADES_LAYOUT.bandaY);
    }
  });
});

describe('código de verificación', () => {
  it('acepta el código como lo tipea una persona', () => {
    expect(normalizeCertificateCode('9qj73 flia6 bg4bh')).toBe('9QJ73-FLIA6-BG4BH');
    expect(normalizeCertificateCode('9QJ73FLIA6BG4BH')).toBe('9QJ73-FLIA6-BG4BH');
  });

  it('rechaza lo que no tiene 15 letras o números', () => {
    expect(normalizeCertificateCode('9QJ73-FLIA6')).toBeNull();
    expect(normalizeCertificateCode('CERT-ABC')).toBeNull();
  });

  it('el ejemplo cumple el formato', () => {
    expect(CERTIFICATE_SAMPLE_CODE).toMatch(CERTIFICATE_CODE_PATTERN);
  });
});

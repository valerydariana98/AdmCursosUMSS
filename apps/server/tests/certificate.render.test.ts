// apps/server/tests/certificate.render.test.ts
// Pruebas de las piezas puras del módulo de certificados: el nombre del archivo
// generado y el tamaño de página, que son los dos valores que, si cambian, llegan
// al usuario sin que nadie lo note hasta que ya repartió los diplomas.

import { describe, expect, it } from 'vitest';
import {
  CERTIFICATE_PAGE_HEIGHT,
  CERTIFICATE_PAGE_WIDTH,
  resolveCertificateVariables,
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

describe('resolución de variables', () => {
  const contexto = {
    nombreEstudiante: 'María Fernanda Vargas Cruz',
    nombreCurso: 'Álgebra I',
    grupo: 'Grupo 3',
    notaFinal: 87,
    fechaEmision: '16/10/2026',
  };

  it('sustituye cada variable conocida por su valor', () => {
    const resultado = resolveCertificateVariables(
      'Se otorga a {nombre_estudiante} por aprobar {nombre_curso}',
      contexto
    );

    expect(resultado).toBe('Se otorga a María Fernanda Vargas Cruz por aprobar Álgebra I');
  });

  it('sustituye todas las variables de una vez', () => {
    const resultado = resolveCertificateVariables(
      '{nombre_estudiante} - {nombre_curso} - {grupo} - {nota_final} - {fecha_emision}',
      contexto
    );

    expect(resultado).toBe(
      'María Fernanda Vargas Cruz - Álgebra I - Grupo 3 - 87 - 16/10/2026'
    );
  });

  it('deja la variable sin resolver a la vista en lugar de borrarla', () => {
    // Un espacio en blanco en el certificado es un defecto invisible hasta que
    // ya se repartió el documento. La etiqueta sin resolver delata el error de
    // tipeo en la plantilla.
    const resultado = resolveCertificateVariables('Alumno: {nombre_apellido}', contexto);

    expect(resultado).toBe('Alumno: {nombre_apellido}');
  });

  it('deja intacto un texto sin variables', () => {
    expect(resolveCertificateVariables('Texto fijo', contexto)).toBe('Texto fijo');
  });

  it('usa los datos de un estudiante sin mezclarlos con los de otro', () => {
    const otro = { ...contexto, nombreEstudiante: 'Carlos Pérez', notaFinal: 55 };

    const primero = resolveCertificateVariables('{nombre_estudiante} ({nota_final})', contexto);
    const segundo = resolveCertificateVariables('{nombre_estudiante} ({nota_final})', otro);

    expect(primero).toBe('María Fernanda Vargas Cruz (87)');
    expect(segundo).toBe('Carlos Pérez (55)');
  });
});
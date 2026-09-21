import { db } from './index.js';
import { tipoEstudiante, tipos } from './schema.js';

async function main() {
  console.log('🌱 Iniciando el seeding de la base de datos...');

  try {
    // 1. Insertar Tipos de Estudiante (externo, umss, aux)
    console.log('⏳ Insertando catálogos en tipo_estudiante...');
    await db
      .insert(tipoEstudiante)
      .values([
        { nombre: 'externo' },
        { nombre: 'umss' },
        { nombre: 'aux' },
      ])
      .onConflictDoNothing();

    // 2. Insertar Tipos de Evaluación (asistencia, eval, trabajo)
    console.log('⏳ Insertando catálogos en tipos de evaluación...');
    await db
      .insert(tipos)
      .values([
        { tipo: 'asistencia' },
        { tipo: 'eval' },
        { tipo: 'trabajo' },
      ])
      .onConflictDoNothing();

    console.log('✅ Seeding completado con éxito en Aiven.');
  } catch (error) {
    console.error('❌ Error ejecutando el seeding:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
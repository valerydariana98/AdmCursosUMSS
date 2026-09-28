import { eq } from 'drizzle-orm';
import { db } from '../../dist/db/index.js';
import { cursos, grupos, instructores } from '../../dist/db/schema.js';

// Reutiliza el instructor de prueba si ya existe
let [inst] = await db.select().from(instructores)
  .where(eq(instructores.ci, 'TEST-INSTRUCTOR'));
if (!inst) {
  [inst] = await db.insert(instructores).values({
    nombres: 'PRUEBA', apPaterno: 'NO TOCAR', apMaterno: 'TEST',
    estado: true, telefono: '00000000', ci: 'TEST-INSTRUCTOR', cargo: 'Prueba',
  }).returning();
}

const [curso] = await db.insert(cursos).values({
  nombreCurso: 'PRUEBA - NO TOCAR', duracionHoras: 10,
  fechaIni: '2099-01-01', fechaFin: '2099-01-31',
  costoAux: 100, costoUmss: 150, costoExterno: 300,
  notaMin: 51, maxFaltas: 3, periodo: '0-TEST', estado: true,
}).returning();

const [grupo] = await db.insert(grupos).values({
  numGrupo: 1, idCurso: curso.id, idInstructor: inst.id,
  horaIni: '08:00', horaFin: '10:00', modalidad: 'presencial',
  minimEst: 1, maxEst: 3, estado: 'habilitado',
}).returning();

console.log('Curso:', curso.id, '| Grupo:', grupo.id);
process.exit(0);
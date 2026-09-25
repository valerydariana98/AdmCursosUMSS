// apps/client/src/services/instructorService.ts
import { Instructor } from '../types/instructor';

// Datos que emulan el JOIN entre Instructores, Usuarios y Grupos
let mockInstructors: Instructor[] = [
  {
    id: 1,
    usuario_id: 101,
    nombres: 'Carlos',
    apPaterno: 'Mamani',
    apMaterno: 'Rojas',
    ci: '8523147',
    telefono: '70012345',
    cargo: 'Docente Titular',
    estado: true,
    email: 'carlos.mamani@umss.edu.bo',
    gruposAsignadosCount: 2,
  },
  {
    id: 2,
    usuario_id: 102,
    nombres: 'Ana',
    apPaterno: 'Quispe',
    apMaterno: 'Fernández',
    ci: '6234891',
    telefono: '71234567',
    cargo: 'Docente Adjunto',
    estado: true,
    email: 'ana.quispe@umss.edu.bo',
    gruposAsignadosCount: 1,
  },
  {
    id: 3,
    usuario_id: 103,
    nombres: 'Jorge',
    apPaterno: 'Vargas',
    apMaterno: 'Salazar',
    ci: '7345612',
    telefono: '69876543',
    cargo: 'Docente Titular',
    estado: true,
    email: 'jorge.vargas@umss.edu.bo',
    gruposAsignadosCount: 1,
  },
  {
    id: 4,
    usuario_id: 104,
    nombres: 'Patricia',
    apPaterno: 'Soto',
    apMaterno: 'Ibáñez',
    ci: '5987234',
    telefono: '72345678',
    cargo: 'Docente Adjunto',
    estado: true,
    email: 'patricia.soto@umss.edu.bo',
    gruposAsignadosCount: 1,
  },
  {
    id: 5,
    usuario_id: 105,
    nombres: 'Daniela',
    apPaterno: 'Rojas',
    apMaterno: 'Peña',
    ci: '6412378',
    telefono: '75123456',
    cargo: 'Docente Invitado',
    estado: true,
    email: 'daniela.rojas@umss.edu.bo',
    gruposAsignadosCount: 1,
  },
  {
    id: 6,
    usuario_id: 106,
    nombres: 'Roberto',
    apPaterno: 'Flores',
    apMaterno: 'Castro',
    ci: '4123987',
    telefono: '73456789',
    cargo: 'Docente Titular',
    estado: false,
    email: 'roberto.flores@umss.edu.bo',
    gruposAsignadosCount: 0,
  },
];

export const instructorService = {
  // Futuro: return (await axios.get('/api/instructores')).data;
  getInstructores: async (): Promise<Instructor[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockInstructors]), 200);
    });
  },
};
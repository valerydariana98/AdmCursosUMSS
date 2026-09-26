// apps/client/src/services/instructorService.ts
import { api } from './api';
import { Instructor, CreateInstructorDTO } from '../types/instructor';

let mockInstructors: Instructor[] = [
  {
    id: 1,
    usuario_id: 101,
    nombres: 'Carlos Juan',
    apPaterno: 'Araoz',
    apMaterno: 'Trigo',
    ci: '8523147',
    telefono: '70012345',
    cargo: 'Docente UMSS',
    estado: true,
    email: 'carlos.araoz@umss.edu.bo',
    username: 'CarlosAraoz2026',
    gruposAsignadosCount: 2,
  },
  {
    id: 2,
    usuario_id: 102,
    nombres: 'María René',
    apPaterno: 'Zeballos',
    apMaterno: 'Justiniano',
    ci: '6234891',
    telefono: '71234567',
    cargo: 'Docente Invitado',
    estado: true,
    email: 'marrene.zeballos@umss.edu.bo',
    username: 'MariaZeballos2026',
    gruposAsignadosCount: 1,
  },
  {
    id: 3,
    usuario_id: 103,
    nombres: 'Gabriel Gonzalo',
    apPaterno: 'Terán',
    apMaterno: 'Bustamante',
    ci: '7345612',
    telefono: '69876543',
    cargo: 'Docente UMSS',
    estado: true,
    email: 'gabriel.teran@umss.edu.bo',
    username: 'GabrielTeran2026',
    gruposAsignadosCount: 1,
  },
  {
    id: 4,
    usuario_id: 104,
    nombres: 'Alejandra Beatriz',
    apPaterno: 'Gutiérrez',
    apMaterno: 'Soliz',
    ci: '5987234',
    telefono: '72345678',
    cargo: 'Auxiliar UMSS',
    estado: true,
    email: 'alejandra.gutierrez@umss.edu.bo',
    username: 'AlejandraGutierrez2026',
    gruposAsignadosCount: 1,
  },
  {
    id: 5,
    usuario_id: 105,
    nombres: 'Fernando José',
    apPaterno: 'Montaño',
    apMaterno: 'Velasco',
    ci: '6412378',
    telefono: '75123456',
    cargo: 'Auxiliar Invitado',
    estado: false,
    email: 'fernando.montano@umss.edu.bo',
    username: 'FernandoMontano2026',
    gruposAsignadosCount: 0,
  },
];

export const instructorService = {
  getInstructores: async (): Promise<Instructor[]> => {
    try {
      return await api.get<Instructor[]>('/instructores');
    } catch {
      return mockInstructors;
    }
  },

  createInstructor: async (data: CreateInstructorDTO): Promise<Instructor> => {
    try {
      return await api.post<Instructor>('/instructores', data);
    } catch {
      const newInst: Instructor = {
        ...data,
        id: mockInstructors.length + 1,
        gruposAsignadosCount: 0,
      };
      mockInstructors = [newInst, ...mockInstructors];
      return newInst;
    }
  },
};
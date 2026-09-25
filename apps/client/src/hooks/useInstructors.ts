// apps/client/src/hooks/useInstructors.ts
import { useState, useEffect, useMemo } from 'react';
import { Instructor } from '../types/instructor';
import { instructorService } from '../services/instructorService';

export const useInstructors = () => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos'); // 'todos' | 'activo' | 'inactivo'

  const fetchInstructors = async () => {
    setLoading(true);
    try {
      const data = await instructorService.getInstructores();
      setInstructors(data);
    } catch (error) {
      console.error('Error cargando instructores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructors();
  }, []);

  // Lógica de filtrado en memoria (Filtra por Nombres, Apellidos, CI y Estado)
  const filteredInstructors = useMemo(() => {
    return instructors.filter((item) => {
      const fullName = `${item.nombres} ${item.apPaterno} ${item.apMaterno}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchTerm.toLowerCase()) || item.ci.includes(searchTerm);

      const matchesStatus =
        statusFilter === 'todos'
          ? true
          : statusFilter === 'activo'
          ? item.estado === true
          : item.estado === false;

      return matchesSearch && matchesStatus;
    });
  }, [instructors, searchTerm, statusFilter]);

  return {
    instructors: filteredInstructors,
    totalCount: instructors.length,
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    refetch: fetchInstructors,
  };
};
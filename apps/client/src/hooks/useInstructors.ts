// apps/client/src/hooks/useInstructors.ts
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import {
  instructorService,
  type InstructorEstadoFilter,
} from '../services/instructorService';
import type { CreateInstructorDTO, Instructor } from '../types/instructor';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export const useInstructors = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilterState] = useState<InstructorEstadoFilter>('todos');
  const [page, setPage] = useState(1);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [search]);

  const setStatusFilter = useCallback((next: InstructorEstadoFilter) => {
    setStatusFilterState(next);
    setPage(1);
  }, []);

  const fetchInstructors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await instructorService.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        estado: statusFilter,
      });

      setInstructors(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudieron cargar los instructores'
      );
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchInstructors();
  }, [fetchInstructors]);

  const addInstructor = async (data: CreateInstructorDTO) => {
    const created = await instructorService.create(data);
    await fetchInstructors();
    return created;
  };

  const updateInstructor = async (id: number, data: CreateInstructorDTO) => {
    const updated = await instructorService.update(id, data);
    await fetchInstructors();
    return updated;
  };

  return {
    instructors,
    total,
    totalCount: total,
    page,
    totalPages,
    loading,
    error,
    searchTerm: search,
    setSearchTerm: setSearch,
    statusFilter,
    setStatusFilter,
    setPage,
    refetch: fetchInstructors,
    addInstructor,
    updateInstructor,
  };
};

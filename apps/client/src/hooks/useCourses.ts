// apps/client/src/hooks/useCourses.ts
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { courseService, type CourseView } from '../services/courseService';
import type { Course } from '../types/course';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export const useCourses = () => {
  const [view, setViewState] = useState<CourseView>('current');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
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

  const setView = useCallback((nextView: CourseView) => {
    setViewState(nextView);
    setPage(1);
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await courseService.list({
        view,
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
      });

      setCourses(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudieron cargar los cursos'
      );
    } finally {
      setLoading(false);
    }
  }, [view, page, debouncedSearch]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return {
    courses,
    total,
    page,
    totalPages,
    loading,
    error,
    view,
    setView,
    search,
    setSearch,
    setPage,
    refetch: fetchCourses,
  };
};

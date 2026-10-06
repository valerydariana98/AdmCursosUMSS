import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { gradeService } from '../services/gradeService';
import {
  toGradeFormValues,
  type GradeStudentFormValues,
  type GradesView,
  type SaveGrades,
} from '../types/grades';

const NO_GROUP_ERROR = 'No se pudo identificar el grupo';

export const useGrades = (groupId: number) => {
  const [view, setView] = useState<GradesView | null>(null);
  const [students, setStudents] = useState<GradeStudentFormValues[]>([]);
  const [loading, setLoading] = useState(true);
  // Se guarda el ApiError completo (y no solo su mensaje) para poder distinguir
  // un 403 de grupo ajeno, un 409 de grupo sin rúbrica y un fallo de conexión.
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchGrades = useCallback(async () => {
    if (!Number.isInteger(groupId) || groupId <= 0) {
      setView(null);
      setStudents([]);
      setError(new ApiError(400, NO_GROUP_ERROR));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loaded = await gradeService.getByGroup(groupId);
      setView(loaded);
      setStudents(toGradeFormValues(loaded));
    } catch (caught) {
      setView(null);
      setStudents([]);
      setError(
        caught instanceof ApiError ? caught : new ApiError(500, 'No se pudieron cargar las notas')
      );
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  const setGrade = (idEstudiante: number, idRubricItem: number, value: string) => {
    setStudents((previous) =>
      previous.map((student) =>
        student.idEstudiante === idEstudiante
          ? {
              ...student,
              grades: {
                ...student.grades,
                [idRubricItem]: { ...student.grades[idRubricItem], value },
              },
            }
          : student
      )
    );
  };

  const saveGrades = async (data: SaveGrades) => {
    setSaving(true);
    try {
      const saved = await gradeService.save(groupId, data);
      setView(saved);
      setStudents(toGradeFormValues(saved));
      return saved;
    } finally {
      setSaving(false);
    }
  };

  return {
    view,
    students,
    loading,
    error,
    saving,
    isForbidden: error?.status === 403,
    isNoRubric: error?.status === 409,
    setGrade,
    saveGrades,
    refetch: fetchGrades,
  };
};

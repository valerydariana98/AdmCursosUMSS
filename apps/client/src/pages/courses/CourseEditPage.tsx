// apps/client/src/pages/courses/CourseEditPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError } from '../../services/api';
import { courseService } from '../../services/courseService';
import type { Course } from '../../types/course';
import CourseFormPage from './CourseFormPage';

const CourseEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchCourse = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await courseService.getById(Number(id));
        if (active) setCourse(result);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof ApiError ? caught.message : 'No se pudo cargar el curso'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCourse();

    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return <div className="p-8 text-sm text-red-600">{error}</div>;
  }

  return <CourseFormPage mode="edit" course={course ?? undefined} loadingCourse={loading} />;
};

export default CourseEditPage;
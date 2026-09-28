import { useEffect, useState } from 'react';
import type { EnrolledStudent } from 'shared';
import { getEnrollments } from '../services/enrollments';

const useGroupEnrollments = (groupId: number) => {
  const [enrollments, setEnrollments] = useState<EnrolledStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEnrollments(groupId)
      .then(setEnrollments)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [groupId]);

  return { enrollments, isLoading, error };
};

export default useGroupEnrollments;
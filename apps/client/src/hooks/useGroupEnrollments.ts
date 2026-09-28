import { useEffect, useState } from "react";
import type { EnrolledStudent } from "shared";
import { getEnrollments } from "../services/enrollments";

const useGroupEnrollments = (groupId: number) => {
  const [enrollments, setEnrollments] = useState<EnrolledStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = () => {
    setIsLoading(true);
    setError(null);
    return getEnrollments(groupId)
      .then(setEnrollments)
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    refetch();
  }, [groupId]);

  return { enrollments, isLoading, error, refetch };
};

export default useGroupEnrollments;

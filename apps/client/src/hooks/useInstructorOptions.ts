// apps/client/src/hooks/useInstructorOptions.ts
import { useEffect, useState } from 'react';
import { instructorService } from '../services/instructorService';
import type { SelectOption } from '../components/Select';

const MAX_OPTIONS = 100;

export const useInstructorOptions = () => {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    instructorService
      .list({ page: 1, limit: MAX_OPTIONS })
      .then((result) => {
        if (cancelled) return;
        setOptions(
          result.data.map((instructor) => ({
            value: instructor.id,
            label: `${instructor.nombres} ${instructor.apPaterno} ${instructor.apMaterno}`,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { options, loading };
};

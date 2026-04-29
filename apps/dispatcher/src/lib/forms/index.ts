import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export function useZodForm<T extends z.ZodTypeAny>(
  schema: T,
  defaultValues?: Partial<z.infer<T>>,
) {
  return useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as z.infer<T>,
    mode: 'onChange',
  });
}

// Re-export commonly used form utilities for convenience
export { z } from 'zod';
export type { UseFormReturn, FieldValues } from 'react-hook-form';

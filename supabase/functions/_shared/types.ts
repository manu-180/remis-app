// Tipos compartidos entre Edge Functions
// Generado/sincronizado con: supabase gen types typescript --local
// Las Edge Functions importan desde acá para tipado consistente

export type { Database } from '../../../packages/shared-types/database.ts';

// Re-exports de tipos de uso frecuente en Edge Functions
export type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from '../../../packages/shared-types/index.ts';

// Punto de entrada de @remis/shared-types
// Helpers tipados sobre Database generado por Supabase

import type { Database } from './database.ts'

export type { Database }

// Helpers de tipo: acceso directo a tablas
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// Tipos de dominio derivados — se llenarán después de correr gen types
// Por ahora usando los enums como source of truth

export type UserRole     = Database['public']['Enums']['user_role']
export type DriverStatus = Database['public']['Enums']['driver_status']
export type RideStatus   = Database['public']['Enums']['ride_status']
export type PaymentStatus = Database['public']['Enums']['payment_status']
export type PaymentMethod = Database['public']['Enums']['payment_method']
export type VehicleType  = Database['public']['Enums']['vehicle_type']
export type KycStatus    = Database['public']['Enums']['kyc_status']
export type DocumentType = Database['public']['Enums']['document_type']

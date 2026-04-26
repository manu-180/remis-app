// ARCHIVO GENERADO AUTOMÁTICAMENTE
// Regenerar con: supabase gen types typescript --local > packages/shared-types/database.ts
// NO editar manualmente

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      // Este archivo se reemplaza completamente al correr:
      // supabase gen types typescript --local
      // Dejado como placeholder hasta correr supabase db reset + gen types
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: unknown[]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      user_role: 'passenger' | 'driver' | 'dispatcher' | 'admin'
      driver_status: 'available' | 'en_route_to_pickup' | 'waiting_passenger' | 'on_trip' | 'on_break' | 'offline' | 'suspended'
      ride_status: 'requested' | 'assigned' | 'en_route_to_pickup' | 'waiting_passenger' | 'on_trip' | 'completed' | 'cancelled_by_passenger' | 'cancelled_by_driver' | 'cancelled_by_dispatcher' | 'no_show'
      payment_status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cash_at_arrival'
      payment_method: 'cash' | 'mp_checkout' | 'account'
      vehicle_type: 'sedan' | 'suv' | 'van' | 'accessible'
      kyc_status: 'pending' | 'approved' | 'rejected' | 'expired'
      document_type: 'luc_d1' | 'vtv' | 'insurance_rc' | 'insurance_passengers' | 'health_card' | 'vehicle_authorization' | 'criminal_record'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ARCHIVO GENERADO AUTOMATICAMENTE
// Regenerar via: pnpm supabase:types o el MCP de Supabase
// NO editar manualmente

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          created_at: string
          diff: Json | null
          entity: string
          entity_id: string
          id: number
          prev_hash: string | null
          row_hash: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          diff?: Json | null
          entity: string
          entity_id: string
          id?: number
          prev_hash?: string | null
          row_hash: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string
          id?: number
          prev_hash?: string | null
          row_hash?: string
        }
        Relationships: []
      }
      driver_current_location: {
        Row: {
          accuracy_m: number | null
          battery_pct: number | null
          driver_id: string
          heading: number | null
          location: unknown
          speed_mps: number | null
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
        }
        Insert: {
          accuracy_m?: number | null
          battery_pct?: number | null
          driver_id: string
          heading?: number | null
          location: unknown
          speed_mps?: number | null
          status: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
        }
        Update: {
          accuracy_m?: number | null
          battery_pct?: number | null
          driver_id?: string
          heading?: number | null
          location?: unknown
          speed_mps?: number | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_current_location_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          driver_id: string
          expires_at: string | null
          file_url: string | null
          id: string
          issued_at: string | null
          updated_at: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          driver_id: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          driver_id?: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_location_history: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: number
          location: unknown
          recorded_at: string
          ride_id: string | null
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: number
          location: unknown
          recorded_at: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: number
          location?: unknown
          recorded_at?: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Relationships: []
      }
      driver_location_history_2026_04: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: number
          location: unknown
          recorded_at: string
          ride_id: string | null
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: number
          location: unknown
          recorded_at: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: number
          location?: unknown
          recorded_at?: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Relationships: []
      }
      driver_location_history_2026_05: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: number
          location: unknown
          recorded_at: string
          ride_id: string | null
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: number
          location: unknown
          recorded_at: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: number
          location?: unknown
          recorded_at?: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Relationships: []
      }
      driver_location_history_2026_06: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: number
          location: unknown
          recorded_at: string
          ride_id: string | null
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: number
          location: unknown
          recorded_at: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: number
          location?: unknown
          recorded_at?: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Relationships: []
      }
      driver_location_history_2026_07: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: number
          location: unknown
          recorded_at: string
          ride_id: string | null
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: number
          location: unknown
          recorded_at: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: number
          location?: unknown
          recorded_at?: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Relationships: []
      }
      driver_location_history_2026_08: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: number
          location: unknown
          recorded_at: string
          ride_id: string | null
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: number
          location: unknown
          recorded_at: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: number
          location?: unknown
          recorded_at?: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Relationships: []
      }
      driver_location_history_2026_09: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: number
          location: unknown
          recorded_at: string
          ride_id: string | null
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: number
          location: unknown
          recorded_at: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: number
          location?: unknown
          recorded_at?: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Relationships: []
      }
      driver_location_history_2026_10: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: number
          location: unknown
          recorded_at: string
          ride_id: string | null
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: number
          location: unknown
          recorded_at: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: number
          location?: unknown
          recorded_at?: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Relationships: []
      }
      driver_location_history_2026_11: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: number
          location: unknown
          recorded_at: string
          ride_id: string | null
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: number
          location: unknown
          recorded_at: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: number
          location?: unknown
          recorded_at?: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Relationships: []
      }
      driver_location_history_2026_12: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: number
          location: unknown
          recorded_at: string
          ride_id: string | null
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: number
          location: unknown
          recorded_at: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: number
          location?: unknown
          recorded_at?: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Relationships: []
      }
      driver_location_history_2027_01: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: number
          location: unknown
          recorded_at: string
          ride_id: string | null
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: number
          location: unknown
          recorded_at: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: number
          location?: unknown
          recorded_at?: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Relationships: []
      }
      driver_location_history_2027_02: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: number
          location: unknown
          recorded_at: string
          ride_id: string | null
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: number
          location: unknown
          recorded_at: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: number
          location?: unknown
          recorded_at?: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Relationships: []
      }
      driver_location_history_2027_03: {
        Row: {
          accuracy_m: number | null
          driver_id: string
          heading: number | null
          id: number
          location: unknown
          recorded_at: string
          ride_id: string | null
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          driver_id: string
          heading?: number | null
          id?: number
          location: unknown
          recorded_at: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string
          heading?: number | null
          id?: number
          location?: unknown
          recorded_at?: string
          ride_id?: string | null
          speed_mps?: number | null
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          current_status: Database["public"]["Enums"]["driver_status"]
          id: string
          is_active: boolean
          is_online: boolean
          joined_at: string | null
          mobile_number: string | null
          rating: number
          total_rides: number
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          current_status?: Database["public"]["Enums"]["driver_status"]
          id: string
          is_active?: boolean
          is_online?: boolean
          joined_at?: string | null
          mobile_number?: string | null
          rating?: number
          total_rides?: number
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          current_status?: Database["public"]["Enums"]["driver_status"]
          id?: string
          is_active?: boolean
          is_online?: boolean
          joined_at?: string | null
          mobile_number?: string | null
          rating?: number
          total_rides?: number
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fares: {
        Row: {
          base_amount_ars: number
          created_at: string
          dest_zone_id: string | null
          effective_from: string
          effective_to: string | null
          flat_amount_ars: number | null
          id: string
          night_surcharge_pct: number
          origin_zone_id: string | null
          per_km_ars: number
        }
        Insert: {
          base_amount_ars: number
          created_at?: string
          dest_zone_id?: string | null
          effective_from: string
          effective_to?: string | null
          flat_amount_ars?: number | null
          id?: string
          night_surcharge_pct?: number
          origin_zone_id?: string | null
          per_km_ars?: number
        }
        Update: {
          base_amount_ars?: number
          created_at?: string
          dest_zone_id?: string | null
          effective_from?: string
          effective_to?: string | null
          flat_amount_ars?: number | null
          id?: string
          night_surcharge_pct?: number
          origin_zone_id?: string | null
          per_km_ars?: number
        }
        Relationships: [
          {
            foreignKeyName: "fares_dest_zone_id_fkey"
            columns: ["dest_zone_id"]
            isOneToOne: false
            referencedRelation: "tariff_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fares_origin_zone_id_fkey"
            columns: ["origin_zone_id"]
            isOneToOne: false
            referencedRelation: "tariff_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      frequent_addresses: {
        Row: {
          address_text: string
          created_at: string
          id: string
          label: string | null
          last_used_at: string | null
          location: unknown
          passenger_id: string
          use_count: number
        }
        Insert: {
          address_text: string
          created_at?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          location: unknown
          passenger_id: string
          use_count?: number
        }
        Update: {
          address_text?: string
          created_at?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          location?: unknown
          passenger_id?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "frequent_addresses_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          metadata: Json | null
          provider: string
          score: number | null
          status: Database["public"]["Enums"]["kyc_status"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          metadata?: Json | null
          provider: string
          score?: number | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          metadata?: Json | null
          provider?: string
          score?: number | null
          status?: Database["public"]["Enums"]["kyc_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verifications_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          ride_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          ride_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          ride_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_webhook_events: {
        Row: {
          action: string | null
          data_id: string
          error_message: string | null
          id: string
          processed_at: string | null
          processed_status: string
          raw_body: Json
          received_at: string
          signature_valid: boolean
          x_request_id: string
        }
        Insert: {
          action?: string | null
          data_id: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          processed_status?: string
          raw_body: Json
          received_at?: string
          signature_valid: boolean
          x_request_id: string
        }
        Update: {
          action?: string | null
          data_id?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          processed_status?: string
          raw_body?: Json
          received_at?: string
          signature_valid?: boolean
          x_request_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          delivered_at: string | null
          fcm_message_id: string | null
          id: string
          read_at: string | null
          recipient_id: string
          sent_at: string | null
          title: string | null
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          delivered_at?: string | null
          fcm_message_id?: string | null
          id?: string
          read_at?: string | null
          recipient_id: string
          sent_at?: string | null
          title?: string | null
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          delivered_at?: string | null
          fcm_message_id?: string | null
          id?: string
          read_at?: string | null
          recipient_id?: string
          sent_at?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          alert_emails: string[] | null
          brand_name: string | null
          id: boolean
          logo_url: string | null
          timezone: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          alert_emails?: string[] | null
          brand_name?: string | null
          id?: boolean
          logo_url?: string | null
          timezone?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          alert_emails?: string[] | null
          brand_name?: string | null
          id?: boolean
          logo_url?: string | null
          timezone?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      passengers: {
        Row: {
          blacklist_reason: string | null
          blacklisted: boolean
          created_at: string
          default_payment_method:
            | Database["public"]["Enums"]["payment_method"]
            | null
          id: string
          notes: string | null
          total_no_shows: number
          total_rides: number
        }
        Insert: {
          blacklist_reason?: string | null
          blacklisted?: boolean
          created_at?: string
          default_payment_method?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          id: string
          notes?: string | null
          total_no_shows?: number
          total_rides?: number
        }
        Update: {
          blacklist_reason?: string | null
          blacklisted?: boolean
          created_at?: string
          default_payment_method?:
            | Database["public"]["Enums"]["payment_method"]
            | null
          id?: string
          notes?: string | null
          total_no_shows?: number
          total_rides?: number
        }
        Relationships: [
          {
            foreignKeyName: "passengers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_ars: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          mp_external_reference: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          paid_at: string | null
          ride_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_ars: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          mp_external_reference?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          ride_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_ars?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          mp_external_reference?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          ride_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          fcm_token: string | null
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          fcm_token?: string | null
          full_name: string
          id: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          fcm_token?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      ride_events: {
        Row: {
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          created_at: string
          from_status: Database["public"]["Enums"]["ride_status"] | null
          id: number
          metadata: Json | null
          ride_id: string
          to_status: Database["public"]["Enums"]["ride_status"]
        }
        Insert: {
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ride_status"] | null
          id?: number
          metadata?: Json | null
          ride_id: string
          to_status: Database["public"]["Enums"]["ride_status"]
        }
        Update: {
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ride_status"] | null
          id?: number
          metadata?: Json | null
          ride_id?: string
          to_status?: Database["public"]["Enums"]["ride_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ride_events_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_ratings: {
        Row: {
          comment: string | null
          created_at: string
          driver_id: string
          id: string
          passenger_id: string
          ride_id: string
          stars: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          driver_id: string
          id?: string
          passenger_id: string
          ride_id: string
          stars: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          passenger_id?: string
          ride_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "ride_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_ratings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_ratings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: true
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          assigned_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          dest_address: string | null
          dest_location: unknown
          dest_zone_id: string | null
          dispatcher_id: string | null
          distance_meters: number | null
          driver_id: string | null
          ended_at: string | null
          estimated_fare_ars: number | null
          final_fare_ars: number | null
          id: string
          notes: string | null
          passenger_id: string
          passengers_count: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_address: string | null
          pickup_arrived_at: string | null
          pickup_location: unknown
          pickup_zone_id: string | null
          requested_at: string
          requested_via: string
          route_geometry: unknown
          scheduled_for: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
          updated_at: string
          vehicle_type_requested:
            | Database["public"]["Enums"]["vehicle_type"]
            | null
        }
        Insert: {
          assigned_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          dest_address?: string | null
          dest_location?: unknown
          dest_zone_id?: string | null
          dispatcher_id?: string | null
          distance_meters?: number | null
          driver_id?: string | null
          ended_at?: string | null
          estimated_fare_ars?: number | null
          final_fare_ars?: number | null
          id?: string
          notes?: string | null
          passenger_id: string
          passengers_count?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_address?: string | null
          pickup_arrived_at?: string | null
          pickup_location: unknown
          pickup_zone_id?: string | null
          requested_at?: string
          requested_via?: string
          route_geometry?: unknown
          scheduled_for?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
          vehicle_type_requested?:
            | Database["public"]["Enums"]["vehicle_type"]
            | null
        }
        Update: {
          assigned_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          dest_address?: string | null
          dest_location?: unknown
          dest_zone_id?: string | null
          dispatcher_id?: string | null
          distance_meters?: number | null
          driver_id?: string | null
          ended_at?: string | null
          estimated_fare_ars?: number | null
          final_fare_ars?: number | null
          id?: string
          notes?: string | null
          passenger_id?: string
          passengers_count?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_address?: string | null
          pickup_arrived_at?: string | null
          pickup_location?: unknown
          pickup_zone_id?: string | null
          requested_at?: string
          requested_via?: string
          route_geometry?: unknown
          scheduled_for?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
          vehicle_type_requested?:
            | Database["public"]["Enums"]["vehicle_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_dest_zone_id_fkey"
            columns: ["dest_zone_id"]
            isOneToOne: false
            referencedRelation: "tariff_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_dispatcher_id_fkey"
            columns: ["dispatcher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_pickup_zone_id_fkey"
            columns: ["pickup_zone_id"]
            isOneToOne: false
            referencedRelation: "tariff_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_trips: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          revoked_at: string | null
          ride_id: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          revoked_at?: string | null
          ride_id: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          revoked_at?: string | null
          ride_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_trips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_trips_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_events: {
        Row: {
          created_at: string
          dispatched_to_dispatcher: boolean
          driver_snapshot: Json | null
          external_contacts_notified: Json | null
          id: string
          location: unknown
          passenger_snapshot: Json | null
          prior_locations: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          ride_id: string | null
          triggered_by: string
          triggered_role: Database["public"]["Enums"]["user_role"]
          vehicle_snapshot: Json | null
        }
        Insert: {
          created_at?: string
          dispatched_to_dispatcher?: boolean
          driver_snapshot?: Json | null
          external_contacts_notified?: Json | null
          id?: string
          location?: unknown
          passenger_snapshot?: Json | null
          prior_locations?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          ride_id?: string | null
          triggered_by: string
          triggered_role: Database["public"]["Enums"]["user_role"]
          vehicle_snapshot?: Json | null
        }
        Update: {
          created_at?: string
          dispatched_to_dispatcher?: boolean
          driver_snapshot?: Json | null
          external_contacts_notified?: Json | null
          id?: string
          location?: unknown
          passenger_snapshot?: Json | null
          prior_locations?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          ride_id?: string | null
          triggered_by?: string
          triggered_role?: Database["public"]["Enums"]["user_role"]
          vehicle_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_events_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_events_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_events_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      tariff_zones: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          polygon: unknown
          priority: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          polygon: unknown
          priority?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          polygon?: unknown
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          make: string | null
          mobile_number: string | null
          model: string | null
          plate: string
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          make?: string | null
          mobile_number?: string | null
          model?: string | null
          plate: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          make?: string | null
          mobile_number?: string | null
          model?: string | null
          plate?: string
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_resolve_kyc: {
        Args: {
          p_decision: Database["public"]["Enums"]["kyc_status"]
          p_notes?: string
          p_verification_id: string
        }
        Returns: {
          created_at: string
          driver_id: string
          id: string
          metadata: Json | null
          provider: string
          score: number | null
          status: Database["public"]["Enums"]["kyc_status"]
          updated_at: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "kyc_verifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_ride: {
        Args: {
          p_dispatcher_id: string
          p_driver_id: string
          p_ride_id: string
        }
        Returns: {
          assigned_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          dest_address: string | null
          dest_location: unknown
          dest_zone_id: string | null
          dispatcher_id: string | null
          distance_meters: number | null
          driver_id: string | null
          ended_at: string | null
          estimated_fare_ars: number | null
          final_fare_ars: number | null
          id: string
          notes: string | null
          passenger_id: string
          passengers_count: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_address: string | null
          pickup_arrived_at: string | null
          pickup_location: unknown
          pickup_zone_id: string | null
          requested_at: string
          requested_via: string
          route_geometry: unknown
          scheduled_for: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
          updated_at: string
          vehicle_type_requested:
            | Database["public"]["Enums"]["vehicle_type"]
            | null
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_ride: {
        Args: { p_actor_id: string; p_reason?: string; p_ride_id: string }
        Returns: {
          assigned_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          dest_address: string | null
          dest_location: unknown
          dest_zone_id: string | null
          dispatcher_id: string | null
          distance_meters: number | null
          driver_id: string | null
          ended_at: string | null
          estimated_fare_ars: number | null
          final_fare_ars: number | null
          id: string
          notes: string | null
          passenger_id: string
          passengers_count: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_address: string | null
          pickup_arrived_at: string | null
          pickup_location: unknown
          pickup_zone_id: string | null
          requested_at: string
          requested_via: string
          route_geometry: unknown
          scheduled_for: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
          updated_at: string
          vehicle_type_requested:
            | Database["public"]["Enums"]["vehicle_type"]
            | null
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_location_history_partition: {
        Args: { target_month: string }
        Returns: undefined
      }
      create_next_month_partition: { Args: never; Returns: undefined }
      create_passenger_profile: {
        Args: { p_full_name: string; p_phone?: string; p_user_id: string }
        Returns: undefined
      }
      create_shared_trip: {
        Args: { p_ride_id: string; p_user_id: string }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      disablelongtransactions: { Args: never; Returns: string }
      driver_arrived_pickup: {
        Args: { p_driver_id: string; p_ride_id: string }
        Returns: {
          assigned_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          dest_address: string | null
          dest_location: unknown
          dest_zone_id: string | null
          dispatcher_id: string | null
          distance_meters: number | null
          driver_id: string | null
          ended_at: string | null
          estimated_fare_ars: number | null
          final_fare_ars: number | null
          id: string
          notes: string | null
          passenger_id: string
          passengers_count: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_address: string | null
          pickup_arrived_at: string | null
          pickup_location: unknown
          pickup_zone_id: string | null
          requested_at: string
          requested_via: string
          route_geometry: unknown
          scheduled_for: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
          updated_at: string
          vehicle_type_requested:
            | Database["public"]["Enums"]["vehicle_type"]
            | null
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      end_trip: {
        Args: {
          p_distance_m?: number
          p_driver_id: string
          p_final_fare?: number
          p_ride_id: string
        }
        Returns: {
          assigned_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          dest_address: string | null
          dest_location: unknown
          dest_zone_id: string | null
          dispatcher_id: string | null
          distance_meters: number | null
          driver_id: string | null
          ended_at: string | null
          estimated_fare_ars: number | null
          final_fare_ars: number | null
          id: string
          notes: string | null
          passenger_id: string
          passengers_count: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_address: string | null
          pickup_arrived_at: string | null
          pickup_location: unknown
          pickup_zone_id: string | null
          requested_at: string
          requested_via: string
          route_geometry: unknown
          scheduled_for: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
          updated_at: string
          vehicle_type_requested:
            | Database["public"]["Enums"]["vehicle_type"]
            | null
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      estimate_fare: {
        Args: {
          at_time?: string
          dest_lat: number
          dest_lng: number
          pickup_lat: number
          pickup_lng: number
        }
        Returns: {
          breakdown: Json
          dest_zone_id: string
          estimated_amount_ars: number
          estimated_distance_m: number
          origin_zone_id: string
        }[]
      }
      find_nearest_available_drivers: {
        Args: {
          limit_count?: number
          max_distance_m?: number
          p_vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          pickup_lat: number
          pickup_lng: number
        }
        Returns: {
          distance_m: number
          driver_id: string
          full_name: string
          heading: number
          mobile_number: string
          plate: string
          rating: number
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_shared_trip: {
        Args: { p_token: string }
        Returns: {
          dest_address: string
          driver_heading: number
          driver_lat: number
          driver_lng: number
          driver_mobile: string
          driver_name: string
          expires_at: string
          pickup_address: string
          ride_id: string
          started_at: string
          status: Database["public"]["Enums"]["ride_status"]
          vehicle_color: string
          vehicle_plate: string
        }[]
      }
      get_shift_summary: { Args: { p_driver_id: string }; Returns: Json }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      is_dispatcher_or_admin: { Args: never; Returns: boolean }
      list_staff: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      pickup_locations_24h: {
        Args: never
        Returns: {
          lat: number
          lng: number
        }[]
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      record_ride_distance: {
        Args: { p_distance_m: number; p_driver_id: string; p_ride_id: string }
        Returns: undefined
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      start_trip: {
        Args: { p_driver_id: string; p_ride_id: string }
        Returns: {
          assigned_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          dest_address: string | null
          dest_location: unknown
          dest_zone_id: string | null
          dispatcher_id: string | null
          distance_meters: number | null
          driver_id: string | null
          ended_at: string | null
          estimated_fare_ars: number | null
          final_fare_ars: number | null
          id: string
          notes: string | null
          passenger_id: string
          passengers_count: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_address: string | null
          pickup_arrived_at: string | null
          pickup_location: unknown
          pickup_zone_id: string | null
          requested_at: string
          requested_via: string
          route_geometry: unknown
          scheduled_for: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ride_status"]
          updated_at: string
          vehicle_type_requested:
            | Database["public"]["Enums"]["vehicle_type"]
            | null
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      top_drivers_today: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          current_status: Database["public"]["Enums"]["driver_status"]
          driver_id: string
          full_name: string
          rating: number
          revenue_today: number
          trips_today: number
        }[]
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_driver_location: {
        Args: {
          p_accuracy_m?: number
          p_battery_pct?: number
          p_driver_id: string
          p_heading?: number
          p_lat: number
          p_lng: number
          p_speed_mps?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      document_type:
        | "luc_d1"
        | "vtv"
        | "insurance_rc"
        | "insurance_passengers"
        | "health_card"
        | "vehicle_authorization"
        | "criminal_record"
      driver_status:
        | "available"
        | "en_route_to_pickup"
        | "waiting_passenger"
        | "on_trip"
        | "on_break"
        | "offline"
        | "suspended"
      kyc_status: "pending" | "approved" | "rejected" | "expired"
      payment_method: "cash" | "mp_checkout" | "account"
      payment_status:
        | "pending"
        | "approved"
        | "rejected"
        | "refunded"
        | "cash_at_arrival"
      ride_status:
        | "requested"
        | "assigned"
        | "en_route_to_pickup"
        | "waiting_passenger"
        | "on_trip"
        | "completed"
        | "cancelled_by_passenger"
        | "cancelled_by_driver"
        | "cancelled_by_dispatcher"
        | "no_show"
      user_role: "passenger" | "driver" | "dispatcher" | "admin"
      vehicle_type: "sedan" | "suv" | "van" | "accessible"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      document_type: [
        "luc_d1",
        "vtv",
        "insurance_rc",
        "insurance_passengers",
        "health_card",
        "vehicle_authorization",
        "criminal_record",
      ],
      driver_status: [
        "available",
        "en_route_to_pickup",
        "waiting_passenger",
        "on_trip",
        "on_break",
        "offline",
        "suspended",
      ],
      kyc_status: ["pending", "approved", "rejected", "expired"],
      payment_method: ["cash", "mp_checkout", "account"],
      payment_status: [
        "pending",
        "approved",
        "rejected",
        "refunded",
        "cash_at_arrival",
      ],
      ride_status: [
        "requested",
        "assigned",
        "en_route_to_pickup",
        "waiting_passenger",
        "on_trip",
        "completed",
        "cancelled_by_passenger",
        "cancelled_by_driver",
        "cancelled_by_dispatcher",
        "no_show",
      ],
      user_role: ["passenger", "driver", "dispatcher", "admin"],
      vehicle_type: ["sedan", "suv", "van", "accessible"],
    },
  },
} as const

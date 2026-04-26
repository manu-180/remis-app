-- Todos los enums centralizados del dominio

create type public.user_role as enum (
  'passenger',
  'driver',
  'dispatcher',
  'admin'
);

create type public.driver_status as enum (
  'available',
  'en_route_to_pickup',
  'waiting_passenger',
  'on_trip',
  'on_break',
  'offline',
  'suspended'
);

create type public.ride_status as enum (
  'requested',
  'assigned',
  'en_route_to_pickup',
  'waiting_passenger',
  'on_trip',
  'completed',
  'cancelled_by_passenger',
  'cancelled_by_driver',
  'cancelled_by_dispatcher',
  'no_show'
);

create type public.payment_status as enum (
  'pending',
  'approved',
  'rejected',
  'refunded',
  'cash_at_arrival'
);

create type public.payment_method as enum (
  'cash',
  'mp_checkout',
  'account'
);

create type public.vehicle_type as enum (
  'sedan',
  'suv',
  'van',
  'accessible'
);

create type public.kyc_status as enum (
  'pending',
  'approved',
  'rejected',
  'expired'
);

create type public.document_type as enum (
  'luc_d1',
  'vtv',
  'insurance_rc',
  'insurance_passengers',
  'health_card',
  'vehicle_authorization',
  'criminal_record'
);

import type { PillVariant } from '@/components/ui/status-pill';
import type { DriverStatus, RideStatus } from '@remis/shared-types';

export function driverStatusToPill(status: DriverStatus): { variant: PillVariant; label: string } {
  switch (status) {
    case 'available':           return { variant: 'online',  label: 'Disponible' };
    case 'en_route_to_pickup':  return { variant: 'busy',    label: 'Yendo al punto' };
    case 'waiting_passenger':   return { variant: 'busy',    label: 'Esperando' };
    case 'on_trip':             return { variant: 'busy',    label: 'En viaje' };
    case 'on_break':            return { variant: 'offline', label: 'En pausa' };
    case 'offline':             return { variant: 'offline', label: 'Sin conexión' };
    case 'suspended':           return { variant: 'danger',  label: 'Suspendido' };
  }
}

export function rideStatusToPill(status: RideStatus): { variant: PillVariant; label: string } {
  switch (status) {
    case 'requested':               return { variant: 'pending', label: 'Solicitado' };
    case 'assigned':                return { variant: 'busy',    label: 'Asignado' };
    case 'en_route_to_pickup':      return { variant: 'busy',    label: 'Yendo al punto' };
    case 'waiting_passenger':       return { variant: 'busy',    label: 'Esperando pasajero' };
    case 'on_trip':                 return { variant: 'busy',    label: 'En viaje' };
    case 'completed':               return { variant: 'online',  label: 'Completado' };
    case 'cancelled_by_passenger':  return { variant: 'danger',  label: 'Cancelado por pasajero' };
    case 'cancelled_by_driver':     return { variant: 'danger',  label: 'Cancelado por conductor' };
    case 'cancelled_by_dispatcher': return { variant: 'danger',  label: 'Cancelado por despacho' };
    case 'no_show':                 return { variant: 'danger',  label: 'No show' };
  }
}

export type DriverStatus =
  | 'available'
  | 'en_route_to_pickup'
  | 'waiting_passenger'
  | 'on_trip'
  | 'on_break'
  | 'offline'
  | 'suspended';

export interface MockDriver {
  id: string;
  internalNumber: string;
  name: string;
  status: DriverStatus;
  statusSince: string;
  distanceKm: number | null;
  avatarInitials: string;
  // Pre-computed so map markers don't jitter on every re-render (Math.random() in render = bad)
  lngOffset: number;
  latOffset: number;
}

export const MOCK_DRIVERS: MockDriver[] = [
  { id: '1', internalNumber: '01', name: 'Carlos Pérez',    status: 'available',          statusSince: '14:20', distanceKm: 1.2, avatarInitials: 'CP', lngOffset:  0.012, latOffset:  0.008 },
  { id: '2', internalNumber: '04', name: 'Ana González',    status: 'on_trip',             statusSince: '14:35', distanceKm: 3.8, avatarInitials: 'AG', lngOffset: -0.015, latOffset:  0.011 },
  { id: '3', internalNumber: '07', name: 'Luis Martínez',   status: 'en_route_to_pickup',  statusSince: '14:41', distanceKm: 0.7, avatarInitials: 'LM', lngOffset:  0.003, latOffset: -0.009 },
  { id: '4', internalNumber: '10', name: 'María Rodríguez', status: 'available',           statusSince: '13:58', distanceKm: 2.1, avatarInitials: 'MR', lngOffset: -0.007, latOffset:  0.014 },
  { id: '5', internalNumber: '12', name: 'Diego Sosa',      status: 'waiting_passenger',   statusSince: '14:38', distanceKm: 0.4, avatarInitials: 'DS', lngOffset:  0.019, latOffset: -0.004 },
  { id: '6', internalNumber: '15', name: 'Laura Vidal',     status: 'on_break',            statusSince: '14:00', distanceKm: null, avatarInitials: 'LV', lngOffset:  0,     latOffset:  0 },
  { id: '7', internalNumber: '18', name: 'Roberto Campos',  status: 'offline',             statusSince: '12:30', distanceKm: null, avatarInitials: 'RC', lngOffset:  0,     latOffset:  0 },
  { id: '8', internalNumber: '21', name: 'Sofía Méndez',   status: 'available',           statusSince: '14:45', distanceKm: 1.9, avatarInitials: 'SM', lngOffset: -0.011, latOffset: -0.016 },
];

export const DRIVER_STATUS_COLORS: Record<DriverStatus, string> = {
  available:          'var(--success)',
  en_route_to_pickup: 'var(--info)',
  waiting_passenger:  'var(--warning)',
  on_trip:            'var(--danger)',
  on_break:           '#FACC15',
  offline:            'var(--neutral-500)',
  suspended:          '#A855F7',
};

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  available:          'Libre',
  en_route_to_pickup: 'Yendo',
  waiting_passenger:  'Esperando',
  on_trip:            'En viaje',
  on_break:           'Descanso',
  offline:            'Offline',
  suspended:          'Suspendido',
};

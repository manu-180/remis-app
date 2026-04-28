export type NotificationType =
  | 'ride_assigned'
  | 'ride_en_route'
  | 'ride_arrived'
  | 'ride_completed'
  | 'ride_cancelled_driver'
  | 'ride_cancelled_passenger'
  | 'driver_new_request'
  | 'driver_timeout'
  | 'document_expiring'
  | 'document_expired'
  | 'heartbeat_missing'
  | 'sos_triggered';

interface Template {
  title: string;
  body: string;
  androidChannel: 'rides_critical' | 'general';
  iosSound: string;
}

const TEMPLATES: Record<NotificationType, Template> = {
  ride_assigned: {
    title: 'Conductor asignado',
    body: 'Tu remís está en camino.',
    androidChannel: 'rides_critical',
    iosSound: 'pedido.caf',
  },
  ride_en_route: {
    title: 'Tu conductor está en camino',
    body: 'Tu remís está en camino.',
    androidChannel: 'rides_critical',
    iosSound: 'default',
  },
  ride_arrived: {
    title: 'Tu remís llegó',
    body: 'El conductor está esperándote.',
    androidChannel: 'rides_critical',
    iosSound: 'default',
  },
  ride_completed: {
    title: 'Viaje completado',
    body: 'Gracias por usar Remís. Tu recorrido finalizó.',
    androidChannel: 'general',
    iosSound: 'default',
  },
  ride_cancelled_driver: {
    title: 'Se canceló tu pedido',
    body: 'El conductor no pudo atenderte. El despacho está buscando otro.',
    androidChannel: 'rides_critical',
    iosSound: 'default',
  },
  ride_cancelled_passenger: {
    title: 'Pedido cancelado',
    body: 'El pasajero canceló el viaje. Quedás disponible.',
    androidChannel: 'general',
    iosSound: 'default',
  },
  driver_new_request: {
    title: 'Nuevo pedido',
    body: 'Tenés un pedido nuevo. Aceptá antes de que se reasigne.',
    androidChannel: 'rides_critical',
    iosSound: 'pedido.caf',
  },
  driver_timeout: {
    title: 'Pedido reasignado',
    body: 'No respondiste a tiempo. El pedido fue a otro conductor.',
    androidChannel: 'general',
    iosSound: 'default',
  },
  document_expiring: {
    title: 'Documento por vencer',
    body: 'Tenés un documento por vencer. Renovalo para seguir activo.',
    androidChannel: 'general',
    iosSound: 'default',
  },
  document_expired: {
    title: 'Documento vencido',
    body: 'Tenés un documento vencido. No podés recibir pedidos hasta renovarlo.',
    androidChannel: 'rides_critical',
    iosSound: 'default',
  },
  heartbeat_missing: {
    title: 'Conexión perdida',
    body: 'No recibimos señal de tu dispositivo. Revisá la app.',
    androidChannel: 'rides_critical',
    iosSound: 'default',
  },
  sos_triggered: {
    title: '¡Alerta SOS!',
    body: 'Se activó una emergencia. Revisá el panel de despacho.',
    androidChannel: 'rides_critical',
    iosSound: 'sos.caf',
  },
};

export function getTemplate(type: NotificationType): Template {
  return TEMPLATES[type] ?? TEMPLATES['ride_assigned'];
}

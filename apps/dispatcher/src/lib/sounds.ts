// Sonidos deshabilitados a pedido del usuario — todos los handlers son no-op.
// Mantenemos las firmas para no romper consumidores existentes.

export function playNewRideSound(): void {}

export function playScheduledRideSound(): void {}

export function playDriverOfflineSound(): void {}

export function playSosSound(): void {}

export function stopSosSound(): void {}

export function registerAudioGesture(): void {}

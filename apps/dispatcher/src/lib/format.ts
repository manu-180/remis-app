import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Currency ARS: "$ 1.234"
// ---------------------------------------------------------------------------
const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatARS(amount: number): string {
  return arsFormatter.format(amount);
}

// ---------------------------------------------------------------------------
// Short date: "29 abr, 14:32"
// ---------------------------------------------------------------------------
export function formatDateShort(date: Date | string): string {
  return format(new Date(date), 'd MMM, HH:mm', { locale: es });
}

// ---------------------------------------------------------------------------
// Distance: "2,3 km" or "850 m"
// ---------------------------------------------------------------------------
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return (meters / 1000).toFixed(1).replace('.', ',') + ' km';
  }
  return Math.round(meters) + ' m';
}

// ---------------------------------------------------------------------------
// Duration: "45 seg", "12 min", "1h 30min"
// ---------------------------------------------------------------------------
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seg`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}min`;
}

// ---------------------------------------------------------------------------
// Phone: preserve format
// ---------------------------------------------------------------------------
export function formatPhone(phone: string): string {
  return phone;
}

// ---------------------------------------------------------------------------
// Relative time: "hace 5 min"
// ---------------------------------------------------------------------------
export function relativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { locale: es, addSuffix: true });
}

// ---------------------------------------------------------------------------
// Initials: "JR" (first letter of each word, max 2)
// ---------------------------------------------------------------------------
export function initials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

interface IllustrationProps { className?: string; }

export function EmptyRidesIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 160" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Body */}
      <rect x="40" y="90" width="120" height="35" rx="6" />
      {/* Cabin */}
      <path d="M65 90 L75 65 L125 65 L135 90" />
      {/* Windows */}
      <rect x="80" y="70" width="18" height="16" rx="2" />
      <rect x="102" y="70" width="18" height="16" rx="2" />
      {/* Wheels */}
      <circle cx="72" cy="128" r="12" />
      <circle cx="72" cy="128" r="5" />
      <circle cx="128" cy="128" r="12" />
      <circle cx="128" cy="128" r="5" />
      {/* Road line */}
      <line x1="20" y1="148" x2="180" y2="148" strokeDasharray="8 6" />
      {/* Stars/motion */}
      <path d="M165 75 L168 68 L171 75 L165 75Z" />
      <path d="M155 55 L157 50 L159 55 L155 55Z" />
    </svg>
  );
}

interface IllustrationProps { className?: string; }

export function EmptyDriversIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 160" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Person */}
      <circle cx="100" cy="45" r="20" />
      {/* Helmet outline */}
      <path d="M80 45 Q80 25 100 25 Q120 25 120 45" strokeWidth="2" />
      <line x1="78" y1="45" x2="122" y2="45" />
      {/* Body */}
      <path d="M75 135 L75 90 Q75 75 100 75 Q125 75 125 90 L125 135" />
      {/* Arms */}
      <path d="M75 100 L55 115" />
      <path d="M125 100 L145 115" />
      {/* Legs */}
      <path d="M90 135 L85 155" />
      <path d="M110 135 L115 155" />
      {/* Badge */}
      <rect x="85" y="95" width="30" height="18" rx="3" />
      <line x1="89" y1="103" x2="111" y2="103" strokeWidth="1" />
      <line x1="89" y1="108" x2="105" y2="108" strokeWidth="1" />
    </svg>
  );
}

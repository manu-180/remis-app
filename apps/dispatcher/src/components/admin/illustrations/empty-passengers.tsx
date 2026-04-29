interface IllustrationProps { className?: string; }

export function EmptyPassengersIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 160" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Person */}
      <circle cx="95" cy="42" r="18" />
      {/* Body */}
      <path d="M72 130 L72 88 Q72 74 95 74 Q118 74 118 88 L118 130" />
      {/* Bag */}
      <rect x="118" y="95" width="28" height="36" rx="4" />
      <path d="M124 95 L124 89 Q124 84 131 84 Q138 84 138 89 L138 95" />
      <line x1="118" y1="108" x2="146" y2="108" />
      {/* Arms */}
      <path d="M72 95 L55 110" />
      <path d="M118 95 L118 115" />
      {/* Legs */}
      <path d="M85 130 L82 152" />
      <path d="M105 130 L108 152" />
      {/* Location pin above head */}
      <path d="M95 10 Q105 10 105 20 Q105 32 95 38 Q85 32 85 20 Q85 10 95 10Z" />
      <circle cx="95" cy="20" r="4" />
    </svg>
  );
}

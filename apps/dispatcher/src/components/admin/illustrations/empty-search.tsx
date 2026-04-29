interface IllustrationProps { className?: string; }

export function EmptySearchIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 160" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Magnifying glass */}
      <circle cx="88" cy="72" r="38" />
      <line x1="116" y1="100" x2="148" y2="132" strokeWidth="4" strokeLinecap="round" />
      {/* Question mark inside */}
      <path d="M82 58 Q82 52 88 52 Q94 52 94 58 Q94 64 88 68 L88 74" strokeWidth="2" />
      <circle cx="88" cy="80" r="2" fill="currentColor" stroke="none" />
      {/* Dashed orbit */}
      <circle cx="88" cy="72" r="52" strokeDasharray="6 5" strokeWidth="0.8" />
      {/* Stars */}
      <line x1="40" y1="35" x2="40" y2="43" />
      <line x1="36" y1="39" x2="44" y2="39" />
      <line x1="155" y1="40" x2="155" y2="46" />
      <line x1="152" y1="43" x2="158" y2="43" />
    </svg>
  );
}

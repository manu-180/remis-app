interface IllustrationProps { className?: string; }

export function EmptyPaymentsIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 200 160" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Bill */}
      <rect x="35" y="50" width="100" height="65" rx="6" />
      <line x1="35" y1="68" x2="135" y2="68" />
      <line x1="50" y1="82" x2="90" y2="82" strokeWidth="1" />
      <line x1="50" y1="92" x2="80" y2="92" strokeWidth="1" />
      <line x1="50" y1="102" x2="85" y2="102" strokeWidth="1" />
      {/* Dollar sign */}
      <text x="105" y="103" fontSize="22" strokeWidth="1" fontFamily="monospace">$</text>
      {/* Coins */}
      <circle cx="150" cy="75" r="18" />
      <circle cx="150" cy="75" r="12" />
      <line x1="150" y1="63" x2="150" y2="87" strokeWidth="1" />
      <circle cx="165" cy="100" r="12" />
      <circle cx="165" cy="100" r="8" />
      {/* Sparkles */}
      <line x1="155" y1="48" x2="155" y2="56" />
      <line x1="151" y1="52" x2="159" y2="52" />
      <line x1="170" y1="55" x2="170" y2="61" />
      <line x1="167" y1="58" x2="173" y2="58" />
    </svg>
  );
}

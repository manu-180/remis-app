import Link from 'next/link';
import { Briefcase, CheckCircle } from 'lucide-react';

const BENEFITS = [
  'Manejo tus propios horarios',
  'Cobros semanales puntuales',
  'Soporte de la agencia',
  'App sencilla, sin complicaciones',
];

export function DriversCta() {
  return (
    <section
      id="conductores"
      className="py-20 md:py-28"
      style={{
        background: 'linear-gradient(135deg, var(--brand-primary) 0%, #1e3a6e 100%)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
              <Briefcase size={15} className="text-[var(--brand-accent)]" />
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">
                Conductores
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-inter-tight)] font-bold text-3xl md:text-4xl text-white mb-4 leading-tight">
              Trabajá con nosotros.<br />
              En tus tiempos.
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              Sumate a la agencia de remises más confiable de la zona. Sin inversión inicial,
              con respaldo local y clientes reales desde el primer día.
            </p>

            <ul className="space-y-3 mb-8">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-3 text-white/80">
                  <CheckCircle
                    size={18}
                    className="shrink-0 text-[var(--brand-accent)]"
                    strokeWidth={2}
                  />
                  {b}
                </li>
              ))}
            </ul>

            <Link
              href="/conductores"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[var(--radius-lg)] font-semibold bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-hover)] transition-colors"
            >
              Quiero ser conductor
            </Link>
          </div>

          <div className="hidden md:flex justify-end">
            <div className="w-64 h-64 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Briefcase size={80} className="text-white/20" strokeWidth={1} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

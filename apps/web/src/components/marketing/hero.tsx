'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Download, Phone } from 'lucide-react';

function CaldénSilhouette() {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute bottom-0 right-0 w-72 md:w-96 opacity-15 pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Trunk */}
      <rect x="190" y="180" width="20" height="120" fill="white" rx="3" />
      {/* Main branches */}
      <path d="M200 180 Q160 140 120 100" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M200 180 Q240 130 280 90" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M200 200 Q150 160 100 130" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M200 200 Q250 155 300 125" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* Secondary branches */}
      <path d="M160 140 Q140 110 110 80" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M120 100 Q90 75 70 50" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M240 130 Q270 100 300 70" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M280 90 Q310 60 330 40" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Foliage clusters */}
      <ellipse cx="105" cy="70" rx="22" ry="16" fill="white" opacity="0.6" />
      <ellipse cx="70" cy="45" rx="18" ry="13" fill="white" opacity="0.5" />
      <ellipse cx="140" cy="55" rx="20" ry="15" fill="white" opacity="0.55" />
      <ellipse cx="300" cy="60" rx="22" ry="16" fill="white" opacity="0.6" />
      <ellipse cx="335" cy="35" rx="18" ry="13" fill="white" opacity="0.5" />
      <ellipse cx="270" cy="42" rx="20" ry="15" fill="white" opacity="0.55" />
      <ellipse cx="200" cy="40" rx="25" ry="18" fill="white" opacity="0.5" />
    </svg>
  );
}

export function Hero() {
  const shouldReduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: shouldReduce ? 0 : 0.08,
      },
    },
  };

  const item: Variants = {
    hidden: shouldReduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { ease: [0.16, 1, 0.3, 1] as [number, number, number, number], duration: 0.45 },
    },
  };

  return (
    <section
      id="inicio"
      className="relative overflow-hidden min-h-[90vh] flex items-center"
      style={{
        background:
          'linear-gradient(135deg, var(--brand-primary) 0%, #2d4a8a 45%, var(--brand-accent) 100%)',
      }}
    >
      {/* Subtle pampa texture overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,.05) 40px, rgba(255,255,255,.05) 41px)',
        }}
        aria-hidden="true"
      />

      <CaldénSilhouette />

      {/* Sentinel for nav intersection observer */}
      <div id="hero-sentinel" className="absolute bottom-0 left-0 w-full h-1" aria-hidden="true" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-28 md:py-40 w-full">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-2xl"
        >
          <motion.div variants={item}>
            <span className="inline-block mb-4 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-white/10 text-white/80 border border-white/20">
              Servicio local
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="font-[family-name:var(--font-inter-tight)] font-bold text-white leading-tight mb-5"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)' }}
          >
            Tu remís en <span className="text-[var(--brand-accent)]">[PUEBLO]</span>,<br />
            a un toque.
          </motion.h1>

          <motion.p
            variants={item}
            className="text-white/75 text-lg md:text-xl leading-relaxed mb-8 max-w-lg"
          >
            Pedí desde la app o llamando. Conductores conocidos, tarifas de ordenanza.
          </motion.p>

          <motion.div variants={item} className="flex flex-wrap gap-3">
            <a
              href="#descargar"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[var(--radius-lg)] font-semibold text-white bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] transition-colors shadow-lg"
            >
              <Download size={18} />
              Descargá la app
            </a>
            <a
              href="tel:+540000000000"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[var(--radius-lg)] font-semibold text-white border-2 border-white/40 hover:bg-white/10 transition-colors"
            >
              <Phone size={18} />
              Llamar a la agencia
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

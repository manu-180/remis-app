import Link from 'next/link';
import { Facebook, Instagram, Phone, Mail, MapPin } from 'lucide-react';

const COLUMNS = [
  {
    title: 'Servicio',
    links: [
      { label: 'Tarifas', href: '/tarifas' },
      { label: 'Cómo funciona', href: '/#como-funciona' },
      { label: 'Conductores', href: '/conductores' },
      { label: 'Preguntas frecuentes', href: '/faq' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos y condiciones', href: '/legal/terminos' },
      { label: 'Privacidad', href: '/legal/privacidad' },
      { label: 'Datos personales', href: '/legal/privacidad' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[var(--neutral-900)] text-[var(--neutral-400)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand column */}
          <div className="sm:col-span-2 md:col-span-1">
            <span className="font-[family-name:var(--font-inter-tight)] font-bold text-xl text-white block mb-3">
              Remis [PUEBLO]
            </span>
            <p className="text-sm leading-relaxed mb-5">
              Servicio de remisería local en La Pampa. Conductores conocidos, tarifas honestas.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="p-2 rounded-[var(--radius-md)] hover:bg-white/10 transition-colors"
              >
                <Facebook size={18} />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="p-2 rounded-[var(--radius-md)] hover:bg-white/10 transition-colors"
              >
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Service + Legal columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-semibold text-white text-sm mb-4">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact column */}
          <div>
            <h3 className="font-semibold text-white text-sm mb-4">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm">
                <MapPin size={15} className="shrink-0 mt-0.5" />
                Av. [Calle], [PUEBLO], La Pampa
              </li>
              <li className="flex items-center gap-2.5 text-sm">
                <Phone size={15} className="shrink-0" />
                <a href="tel:+540000000000" className="hover:text-white transition-colors">
                  (0000) 000-0000
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-sm">
                <Mail size={15} className="shrink-0" />
                <a
                  href="mailto:info@remis.com.ar"
                  className="hover:text-white transition-colors"
                >
                  info@remis.com.ar
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <p>© 2026 [Razón social]. Habilitación municipal N° XXX.</p>
          <p>Hecho en La Pampa, Argentina.</p>
        </div>
      </div>
    </footer>
  );
}

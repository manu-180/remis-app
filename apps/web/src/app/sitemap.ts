import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://remis.com.ar';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/tarifas`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/conductores`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contacto`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.6 },
    { url: `${base}/legal/terminos`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/legal/privacidad`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];
}

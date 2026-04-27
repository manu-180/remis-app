import type { Metadata } from 'next';
import { readFileSync } from 'fs';
import { join } from 'path';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Términos y condiciones de uso del servicio de remisería.',
};

function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={key++} className="font-[family-name:var(--font-inter-tight)] font-bold text-3xl text-[var(--neutral-900)] mt-8 mb-4">
          {line.slice(2)}
        </h1>,
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="font-[family-name:var(--font-inter-tight)] font-bold text-2xl text-[var(--neutral-900)] mt-8 mb-3">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="font-[family-name:var(--font-inter-tight)] font-semibold text-xl text-[var(--neutral-800)] mt-6 mb-2">
          {line.slice(4)}
        </h3>,
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={key++} className="border-l-4 border-[var(--brand-accent)] pl-4 py-1 my-4 text-[var(--neutral-500)] italic">
          {line.slice(2)}
        </blockquote>,
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={key++} className="ml-5 list-disc text-[var(--neutral-700)] mb-1">
          {line.slice(2)}
        </li>,
      );
    } else if (/^\d+\./.test(line)) {
      elements.push(
        <li key={key++} className="ml-5 list-decimal text-[var(--neutral-700)] mb-1">
          {line.replace(/^\d+\.\s*/, '')}
        </li>,
      );
    } else if (line.startsWith('---')) {
      elements.push(<hr key={key++} className="my-6 border-[var(--neutral-200)]" />);
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(
        <p key={key++} className="text-[var(--neutral-700)] leading-relaxed mb-2">
          {line}
        </p>,
      );
    }
  }

  return elements;
}

export default function TerminosPage() {
  const filePath = join(process.cwd(), '..', '..', 'docs', 'legal', 'terms.md');
  let content = '';
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    content = '# Términos y condiciones\n\nDocumento no disponible.';
  }

  return <div className="prose-legal">{renderMarkdown(content)}</div>;
}

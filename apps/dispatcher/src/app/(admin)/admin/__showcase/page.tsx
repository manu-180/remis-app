import { notFound } from 'next/navigation';
import { ShowcaseClient } from './showcase-client';

export default function ShowcasePage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ShowcaseClient />;
}

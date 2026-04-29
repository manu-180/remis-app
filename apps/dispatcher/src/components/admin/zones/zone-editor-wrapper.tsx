'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { ZoneEditorInnerProps } from './zone-editor';

const ZoneEditorInner = dynamic(
  () => import('./zone-editor').then((m) => m.ZoneEditorInner),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full" />,
  }
);

export function ZoneEditor(props: ZoneEditorInnerProps) {
  return <ZoneEditorInner {...props} />;
}

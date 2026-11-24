import { Suspense } from 'react';
import { Subscribe } from '@/components/Subscribe';

export const metadata = { title: 'Assinar — ÁLIBI' };
export default function Page() {
  return (
    <Suspense>
      <Subscribe />
    </Suspense>
  );
}

// app/not-found.tsx  (Server Component)
import { Suspense } from 'react';
import NotFoundClient from './not-found-client';
;

export default function NotFound() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    }>
      <NotFoundClient />
    </Suspense>
  );
}

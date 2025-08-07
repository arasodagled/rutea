'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function NotFoundClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Página no encontrada</h1>
      <p className="text-lg text-gray-600 mb-8">Lo sentimos, la página que buscas no existe o ha sido movida.</p>
      <Button onClick={() => router.push('/')} className="px-6 py-2">
        Volver al inicio
      </Button>
    </div>
  );
}
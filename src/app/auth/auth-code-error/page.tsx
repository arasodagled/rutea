'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Main component that wraps the content in Suspense
export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Cargando...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <AuthCodeErrorContent />
    </Suspense>
  );
}

// Component that uses useSearchParams
function AuthCodeErrorContent() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('error') || 'Hubo un error al procesar tu verificación de correo electrónico.';
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-red-600">Error de Autenticación</CardTitle>
          <CardDescription>
            {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="mb-2 font-medium">Esto podría suceder si:</p>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>El enlace de verificación ha expirado</li>
            <li>El enlace ya ha sido utilizado</li>
            <li>Hubo un error de red</li>
          </ul>
          <p className="mb-4">
            Problema más común: Los enlaces de verificación de correo electrónico expiran después de 1 hora. Si esperaste demasiado para hacer clic en el enlace, necesitarás solicitar uno nuevo.
          </p>
          <div className="flex flex-col space-y-2">
            <Link href="/login">
              <Button className="w-full">
                Ir a Iniciar Sesión/Registrarse
              </Button>
              <p className="text-sm text-center mt-2">
                En el formulario de registro, puedes solicitar un nuevo correo de verificación
              </p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
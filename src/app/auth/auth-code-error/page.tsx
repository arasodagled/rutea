'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthCodeErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-red-600">Error de Autenticación</CardTitle>
          <CardDescription>
            Hubo un error al procesar tu verificación de correo electrónico.
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
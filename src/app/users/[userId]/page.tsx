'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Linkedin, Mail, User, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AutoconocimientoComponent } from '@/components/users/AutoconocimientoComponent';
import { MapaDeRutaComponent } from '@/components/users/MapaDeRutaComponent';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  user_type: string;
  status: string;
  linkedin_url: string;
  cv_file_path: string;
  cv_file_name: string;
  created_at: string;
  updated_at: string;
  email?: string;
}

export default function UserDetailPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const params = useParams();
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  const userId = params.userId as string;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      
      // Add a small delay to ensure the page has fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use the database function to get user profile with email
      const { data, error } = await supabase
        .rpc('get_user_profile_with_email', { target_user_id: userId });
  
      if (error) {
        console.error('Error fetching user:', error);
        return;
      }
  
      // The function returns an array, so we take the first item
      const userProfile = data && data.length > 0 ? data[0] : null;
      setUser(userProfile);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId, fetchUser]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'active':
        return 'Activo';
      case 'completed':
        return 'Completado';
      case 'inactive':
        return 'Inactivo';
      default:
        return status;
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'user':
        return 'bg-blue-100 text-blue-800';
      case 'candidate':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/users')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Cargando usuario...
          </h1>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-gray-600">Cargando información del usuario...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/users')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Usuario no encontrado
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            El usuario que buscas no existe o no tienes permisos para verlo.
          </p>
        </div>
      </div>
    );
  }

  const fullName = `${user.first_name} ${user.last_name}`.trim() || 'Sin nombre';

  return (
    <div className="p-6">
      {/* Header with Volver Button */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/users')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {fullName}
        </h1>
      </div>

      {/* User Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalles del Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Nombre Completo
                </label>
                <p className="text-gray-900 dark:text-gray-100">{fullName}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Email
                </label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <p className="text-gray-900 dark:text-gray-100">{user.email || "Sin email"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Tipo de Usuario
                </label>
                <div>
                  <Badge className={getUserTypeColor(user.user_type)}>
                    {user.user_type || 'user'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Estado
                </label>
                <div>
                  <Badge className={getStatusColor(user.status)}>
              {getStatusText(user.status) || 'Pendiente'}
            </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Última Actualización
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="text-gray-900 dark:text-gray-100">
                    {isClient ? format(new Date(user.updated_at), 'MMM dd, yyyy') : 'Cargando...'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CV and LinkedIn */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  CV
                </label>
                {user.cv_file_path ? (
                  <div className="flex items-center gap-2 mt-1">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <a
                      href={user.cv_file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {user.cv_file_name || 'Descargar CV'}
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 mt-1">Sin CV subido</p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Perfil de LinkedIn
                </label>
                {user.linkedin_url ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Linkedin className="h-4 w-4 text-gray-400" />
                    <a
                      href={user.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Ver Perfil de LinkedIn
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 mt-1">Sin perfil de LinkedIn</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="autoconocimiento" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="autoconocimiento">Autoconocimiento</TabsTrigger>
            <TabsTrigger value="mapa-ruta">Mapa de Ruta</TabsTrigger>
          </TabsList>
        
        <TabsContent value="autoconocimiento" className="mt-6">
          <AutoconocimientoComponent userId={userId} />
        </TabsContent>
        
        <TabsContent value="mapa-de-ruta" className="mt-6">
          <MapaDeRutaComponent userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

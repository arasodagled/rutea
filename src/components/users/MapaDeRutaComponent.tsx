'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { 
  Map, 
  Target, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MapaDeRutaItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  progress: number;
  created_at: string;
}

interface MapaDeRutaComponentProps {
  userId: string;
}

export function MapaDeRutaComponent({ userId }: MapaDeRutaComponentProps) {
  const [roadmapItems, setRoadmapItems] = useState<MapaDeRutaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    fetchRoadmapItems();
  }, [userId]);

  const fetchRoadmapItems = async () => {
    try {
      setLoading(true);
      
      // For now, we'll use mock data since the roadmap feature isn't fully implemented
      // In a real implementation, you would fetch from a 'roadmap_items' table
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data for demonstration
      const mockData: MapaDeRutaItem[] = [
        {
          id: '1',
          title: 'Completar Evaluación de Habilidades',
          description: 'Evaluar habilidades técnicas y blandas actuales para identificar brechas',
          status: 'completed',
          priority: 'high',
          due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          progress: 100,
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          title: 'Actualizar Perfil de LinkedIn',
          description: 'Optimizar perfil de LinkedIn con nuevas habilidades y experiencias',
          status: 'in_progress',
          priority: 'medium',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          progress: 60,
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          title: 'Eventos de Networking',
          description: 'Asistir a 3 eventos de networking de la industria este mes',
          status: 'pending',
          priority: 'medium',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          progress: 0,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '4',
          title: 'Desarrollo de Portafolio',
          description: 'Crear un portafolio en línea mostrando proyectos recientes',
          status: 'pending',
          priority: 'high',
          due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          progress: 0,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setRoadmapItems(mockData);
    } catch (error) {
      console.error('Error fetching roadmap items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'blocked':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Target className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'blocked':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'in_progress':
        return 'En Progreso';
      case 'pending':
        return 'Pendiente';
      case 'blocked':
        return 'Bloqueado';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getOverallProgress = () => {
    if (roadmapItems.length === 0) return 0;
    const totalProgress = roadmapItems.reduce((sum, item) => sum + item.progress, 0);
    return Math.round(totalProgress / roadmapItems.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with overall progress */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Mapa de Ruta Profesional
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Seguir el progreso hacia objetivos profesionales
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Agregar Objetivo
        </Button>
      </div>

      {/* Overall Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Progreso General
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {getOverallProgress()}% Completado
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {roadmapItems.filter(item => item.status === 'completed').length} de {roadmapItems.length} objetivos completados
              </span>
            </div>
            <Progress value={getOverallProgress()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Roadmap Items */}
      <div className="space-y-4">
        {roadmapItems.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Sin Elementos en el Mapa de Ruta
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Comienza a construir el mapa de ruta profesional de este usuario agregando objetivos e hitos.
                </p>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Primer Objetivo
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          roadmapItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(item.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.title}
                        </h3>
                        <Badge className={getStatusColor(item.status)}>
                          {getStatusText(item.status)}
                        </Badge>
                        <Badge className={getPriorityColor(item.priority)}>
                          prioridad {item.priority === 'high' ? 'alta' : item.priority === 'medium' ? 'media' : 'baja'}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {item.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Vence {isClient ? format(new Date(item.due_date), 'dd MMM yyyy', { locale: es }) : "Cargando..."}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Progreso:</span>
                          <div className="w-20">
                            <Progress value={item.progress} className="h-1" />
                          </div>
                          <span>{item.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
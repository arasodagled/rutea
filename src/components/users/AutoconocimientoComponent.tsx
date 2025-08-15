'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { Brain, Target, Star, TrendingUp, Eye, RotateCcw, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Resumen {
  id: string;
  proposito: string;
  talentos_clave: string[];
  motivaciones: string[];
  experiencia_destacada: string;
  claridad_actual: string;
  cambio_carrera: string;
  vision_1_ano: string | Record<string, unknown>; // Replace 'any' with a more specific type based on what this field actually contains
  impacto_ejercicio: string;
  created_at: string;
  updated_at: string;
}

interface AutoconocimientoComponentProps {
  userId: string;
}

export function AutoconocimientoComponent({ userId }: AutoconocimientoComponentProps) {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    fetchResumen();
  }, [userId]);

  const fetchResumen = async () => {
    try {
      setLoading(true);
      
      // Primero intentar obtener resumen existente
      const { data: existingResumen, error: fetchError } = await supabase
        .from('resumenes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingResumen) {
        setResumen(existingResumen);
        setLoading(false);
        return;
      }

      // Si no existe resumen, verificar si hay un error real o simplemente no hay datos
      if (!existingResumen) {
        // Si hay un error que no sea "not found", mostrar el error
        if (fetchError && fetchError.code && fetchError.code !== 'PGRST116') {
          console.error('Error fetching resumen:', fetchError);
          setResumen(null);
          return;
        }
        
        // Si no hay resumen (sin error o error "not found"), generar uno nuevo
        console.log('No existing resumen found, generating new one with OpenAI...');
        
        const response = await fetch('/api/resumen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        if (response.ok) {
          const newResumen = await response.json();
          setResumen(newResumen);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Error generating resumen:', errorData);
          setResumen(null);
        }
      }
    } catch (error) {
      console.error('Error in fetchResumen:', error);
      setResumen(null);
    } finally {
      setLoading(false);
    }
  };

  const regenerateResumen = async () => {
    try {
      setRegenerating(true);
      
      const response = await fetch('/api/resumen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const newResumen = await response.json();
        setResumen(newResumen);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error regenerating resumen:', errorData);
      }
    } catch (error) {
      console.error('Error regenerating resumen:', error);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!resumen) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Generando Resumen de Autoconocimiento
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              El resumen se genera automáticamente analizando todas las conversaciones del usuario con IA.
            </p>
            <Button
              onClick={fetchResumen}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              Generar Resumen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with timestamp and regenerate button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Autoconocimiento Assessment
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>Completado {isClient ? format(new Date(resumen.updated_at), 'dd MMM yyyy', { locale: es }) : "Cargando..."}</span>
          </div>
          <Button
            onClick={regenerateResumen}
            disabled={regenerating}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RotateCcw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerando...' : 'Regenerar Resumen'}
          </Button>
        </div>
      </div>

      {/* Purpose */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Propósito y Visión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {resumen.proposito || 'No purpose defined'}
          </p>
        </CardContent>
      </Card>

      {/* Key Talents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-600" />
            Talentos Clave
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resumen.talentos_clave && resumen.talentos_clave.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {resumen.talentos_clave.map((talento, index) => (
                <Badge key={index} variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {talento}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No talents identified</p>
          )}
        </CardContent>
      </Card>

      {/* Motivations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Motivaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resumen.motivaciones && resumen.motivaciones.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {resumen.motivaciones.map((motivacion, index) => (
                <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                  {motivacion}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No motivations identified</p>
          )}
        </CardContent>
      </Card>

      {/* Outstanding Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-purple-600" />
            Outstanding Experience
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {resumen.experiencia_destacada || 'No outstanding experience described'}
          </p>
        </CardContent>
      </Card>

      {/* Current Clarity & Career Change */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Current Clarity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300">
              {resumen.claridad_actual || 'No clarity level specified'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-600" />
              Career Change
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300">
              {resumen.cambio_carrera || 'No career change information'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 1-Year Vision */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" />
            Visión a 1 Año
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resumen.vision_1_ano ? (
            typeof resumen.vision_1_ano === 'object' ? (
              <div className="space-y-3">
                {Object.entries(resumen.vision_1_ano).map(([key, value]) => (
                  <div key={key}>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {key.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      {String(value)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {String(resumen.vision_1_ano)}
              </p>
            )
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No 1-year vision defined</p>
          )}
        </CardContent>
      </Card>

      {/* Exercise Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-pink-600" />
            Exercise Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {resumen.impacto_ejercicio || 'No exercise impact described'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
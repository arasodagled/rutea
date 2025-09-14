import { NextRequest } from 'next/server';
import { OpenAI } from 'openai';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response('User ID is required', { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    // Obtener todos los mensajes del usuario
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return new Response('Error fetching user messages', { status: 500 });
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({
        error: 'No messages found for this user'
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Preparar el contexto de la conversación para OpenAI
    const conversationContext = messages
      .map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
      .join('\n\n');

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Prompt para generar el resumen de autoconocimiento
    const systemPrompt = `Eres un experto en análisis de conversaciones de coaching profesional. Tu tarea es analizar toda la conversación entre un usuario y un career coach para generar un resumen estructurado de autoconocimiento.

Basándote en la conversación completa, extrae y analiza la siguiente información del usuario:

1. **Propósito y Visión**: ¿Cuál es el propósito profesional y la visión a largo plazo que ha expresado el usuario?

2. **Talentos Clave**: ¿Cuáles son las principales fortalezas, habilidades y talentos que el usuario ha mencionado o que se pueden inferir?

3. **Motivaciones**: ¿Qué motiva al usuario en su carrera profesional? ¿Qué valores y drivers internos ha expresado?

4. **Experiencia Destacada**: ¿Cuáles son los logros, experiencias o momentos profesionales más significativos que ha compartido?

5. **Claridad Actual**: ¿Qué nivel de claridad tiene el usuario sobre su dirección profesional? ¿Qué dudas o incertidumbres ha expresado?

6. **Cambio de Carrera**: ¿Ha expresado interés en cambiar de carrera, rol o industria? ¿Qué cambios está considerando?

7. **Visión a 1 Año**: ¿Qué objetivos o metas profesionales ha mencionado para el próximo año?

8. **Impacto del Ejercicio**: ¿Cómo ha impactado esta conversación de coaching en su autoconocimiento y claridad profesional?

Responde en formato JSON con la siguiente estructura:
{
  "proposito": "string",
  "talentos_clave": ["string1", "string2", "string3"],
  "motivaciones": ["string1", "string2", "string3"],
  "experiencia_destacada": "string",
  "claridad_actual": "string",
  "cambio_carrera": "string",
  "vision_1_ano": "string",
  "impacto_ejercicio": "string",
  "roles_industrias": "string",
  "tareas_disfrutadas": ["string1", "string2", "string3"],
  "tareas_no_disfrutadas": ["string1", "string2", "string3"],
  "valores": ["string1", "string2", "string3"],
  "rango_salarial": "string",
  "beneficios": ["string1", "string2", "string3"],
  "ambiente_laboral": "string",
  "comentarios_adicionales": "string"
}

Si alguna información no está disponible en la conversación, usa "No especificado en la conversación" para ese campo.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Analiza la siguiente conversación de coaching profesional y genera el resumen de autoconocimiento:\n\n${conversationContext}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const resumenText = completion.choices[0]?.message?.content;
    
    if (!resumenText) {
      return new Response('Error generating summary', { status: 500 });
    }

    // Función para extraer JSON del formato markdown
    function extractJsonFromMarkdown(text: string): string {
      // Buscar contenido entre ```json y ```
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return jsonMatch[1].trim();
      }
      
      // Si no hay markdown, devolver el texto tal como está
      return text.trim();
    }

    // Parsear la respuesta JSON
    let resumenData;
    try {
      const cleanJsonText = extractJsonFromMarkdown(resumenText);
      resumenData = JSON.parse(cleanJsonText);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw response:', resumenText);
      return new Response('Error parsing AI response', { status: 500 });
    }

    // Guardar o actualizar el resumen en la base de datos
    const { data: existingResumen } = await supabase
      .from('resumenes')
      .select('id')
      .eq('user_id', userId)
      .single();

    let savedResumen;
    if (existingResumen) {
      // Actualizar resumen existente
      const { data, error } = await supabase
        .from('resumenes')
        .update({
          ...resumenData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating resumen:', error);
        return new Response('Error saving summary', { status: 500 });
      }
      savedResumen = data;
    } else {
      // Crear nuevo resumen
      const { data, error } = await supabase
        .from('resumenes')
        .insert({
          user_id: userId,
          ...resumenData
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating resumen:', error);
        return new Response('Error saving summary', { status: 500 });
      }
      savedResumen = data;
    }

    return new Response(JSON.stringify(savedResumen), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in resumen API:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
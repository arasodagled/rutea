'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { fetchEventSource } from '@microsoft/fetch-event-source';

// Función para formatear el texto de OpenAI
function formatOpenAIText(text: string): string {
  // Agregar saltos de línea simples antes de números seguidos de punto
  let formatted = text.replace(/(\d+\.)\s*/g, '\n$1 ');
  
  // Convertir **texto** a <strong>texto</strong>
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convertir *texto* a <em>texto</em>
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Limpiar saltos de línea múltiples al inicio
  formatted = formatted.replace(/^\n+/, '');
  
  // Eliminar saltos de línea múltiples consecutivos
  formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n');
  
  // Convertir saltos de línea a <br>
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}

interface Message {
  id?: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export function Chat({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Fetch chat history from Supabase
    const fetchMessages = async () => {
      console.log('Fetching messages for userId:', userId);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {

        console.error('Error fetching messages:', error);
      } else {
        const fetchedMessages = data || [];

        console.log('Fetched messages:', fetchedMessages.length, fetchedMessages);
        setMessages(fetchedMessages);
        
        // If no previous messages, send initial prompt
        if (fetchedMessages.length === 0) {
          sendInitialMessage();
        }
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${userId}` },
        (payload) => {
          setMessages((prevMessages) => [...prevMessages, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  const sendInitialMessage = async () => {
    const initialPrompt = "¿Me orientas en mi busqueda profesional? Primero cuentame como puedo empezar este ejercicio";
    
    // Insert initial user message
    const userMsg: Message = { user_id: userId, role: 'user', content: initialPrompt };
    setMessages([userMsg]);
    await supabase.from('messages').insert(userMsg);
    setLoading(true);

    // Prepare assistant placeholder
    setMessages((m) => [...m, { user_id: userId, role: 'assistant', content: '' }]);

    // Stream from API
    let assistantContent = '';
    try {
      await streamChat([userMsg], (delta) => {
        assistantContent += delta;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            { ...last, content: assistantContent },
          ];
        });
      });
      
      // Save complete assistant message
      await supabase.from('messages').insert({
        user_id: userId,
        role: 'assistant',
        content: assistantContent,
      });
    } catch (err) {

      console.error(err);
      setMessages((m) => [
        ...m,
        { user_id: userId, role: 'assistant', content: 'Error: No se pudo establecer la conexión.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Additional scroll during streaming for real-time updates
  useEffect(() => {
    if (loading) {
      const intervalId = setInterval(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
      return () => clearInterval(intervalId);
    }
  }, [loading]);

  async function streamChat(
    messages: Message[],
    onDelta: (delta: string) => void
  ) {
    await fetchEventSource('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      onopen: async (res) => {
         if (!res.ok) throw new Error('Failed to open stream');
       },
      onmessage: (ev) => {
        // OpenAI streams lines like:
        //   data: {"id":"...","choices":[{"delta":{"content":"Hello"},"index":0,"finish_reason":null}]}
        //   data: [DONE]
        if (ev.data === '[DONE]') return;
        try {
          const parsed = JSON.parse(ev.data);
          const delta = parsed.choices[0].delta.content;
          if (delta) onDelta(delta);
        } catch (err) {

          console.error('Stream parse error', err, ev.data);
        }
      },
      onerror: (err) => {

        console.error('Stream error', err);
        throw err;
      },
    });
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 1️⃣ Insert user message locally & to Supabase
    const userMsg: Message = { user_id: userId, role: 'user', content: input };
    setMessages((m) => [...m, userMsg]);
    await supabase.from('messages').insert(userMsg);
    setInput('');
    setLoading(true);

    // 2️⃣ Prepare assistant placeholder
    setMessages((m) => [...m, { user_id: userId, role: 'assistant', content: '' }]);

    // 3️⃣ Stream from API
    let assistantContent = '';
    try {
      await streamChat([...messages, userMsg], (delta) => {
        assistantContent += delta;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            { ...last, content: assistantContent },
          ];
        });
      });
      // 4️⃣ Check if response is a JSON resumen and save it
      try {
        // Try to parse the entire response as JSON first
        let parsedJson;
        try {
          parsedJson = JSON.parse(assistantContent.trim());
        } catch {
          // If that fails, look for JSON pattern in the text
          const jsonMatch = assistantContent.match(/{[\s\S]*"resumen"[\s\S]*}/); 
          if (jsonMatch) {
            parsedJson = JSON.parse(jsonMatch[0]);
          }
        }
        
        if (parsedJson && parsedJson.resumen) {
          // Save resumen to database
          const response = await fetch('/api/resumen', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ resumen: parsedJson.resumen }),
          });
          
          if (response.ok) {

            console.log('Resumen saved successfully');
          } else {

          console.error('Failed to save resumen');
        }
        }
      } catch (error) {

        console.error('Error processing JSON resumen:', error);
      }
      
      // 5️⃣ Save complete assistant message
      await supabase.from('messages').insert({
        user_id: userId,
        role: 'assistant',
        content: assistantContent,
      });
    } catch (err) {

      console.error(err);
      setMessages((m) => [
        ...m,
        { user_id: userId, role: 'assistant', content: 'Error: No se pudo establecer la conexión.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full max-w-3xl mx-auto">
      {/* Chat Header - fixed to viewport top */}
      <div className="fixed top-0 left-0 right-0 lg:left-64 z-50 bg-white dark:bg-gray-900 flex items-center justify-between py-4 px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src="/images/rutea-avatar.png" alt="Maria Rutea" />
            <AvatarFallback className="text-lg">MR</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Maria Rutea
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ¿Tienes alguna duda o problema?
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
          onClick={() => {
            // You can add contact functionality here
            console.log('Contact button clicked');
          }}
        >
          Contáctanos
        </Button>
      </div>
      
      {/* Chat content */}
      <div className="space-y-4 p-4 pt-24">
          
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-lg p-3 max-w-[70%] ${
                  msg.role === 'user'
                    ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                    : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {msg.role === 'assistant' ? (
                  isClient ? (
                    <div 
                      className="text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: formatOpenAIText(msg.content) 
                      }}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSendMessage} className="p-4">
          <div className="relative flex items-end bg-white border border-gray-300 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-200 focus-within:border-gray-400 focus-within:shadow-md">
            <textarea
              placeholder="Pregunta lo que quieras"
              className="flex-1 min-h-[24px] max-h-[200px] resize-none bg-transparent px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 border-none outline-none leading-6"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 200) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 bottom-2 p-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="transform rotate-45">
                  <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
  );
}

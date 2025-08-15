'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useBottomAnchor } from '@/hooks/useBottomAnchor';

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

export const Chat = React.memo(function Chat({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Replace all the manual scroll state with this hook
  const { isNearBottom, isUserScrolling, scrollToBottom, maybeScrollToBottom } = 
    useBottomAnchor(scrollAreaRef, messagesEndRef, { tolerance: 120 });

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // REPLACE all the complex scroll effects with this single guarded effect
  useEffect(() => {
    if (!loading) return;
    // messages changes on every chunk; follow only when near bottom
    maybeScrollToBottom('auto');
  }, [messages, loading, maybeScrollToBottom]);

  // Keep exactly one "initial scroll" — and guard it
  useEffect(() => {
    if (messages.length === 0) return;
    if (loading) return;                 // don't fight the stream
    if (!isNearBottom) return;           // don't yank the user down
    scrollToBottom('auto');
  }, [messages.length, loading, isNearBottom, scrollToBottom]);

  // Guard your "scroll the last user message to top" effect (optional)
  useEffect(() => {
    if (!shouldAutoScroll || isUserScrolling) return;
    
    // Find the LAST USER message (not just the last message)
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }
    
    if (lastUserMessageIndex !== -1) {
      setTimeout(() => {
        const messageElements = document.querySelectorAll('[data-message-index]');
        const userMessageElement = messageElements[lastUserMessageIndex] as HTMLElement;
        
        if (userMessageElement) {
          userMessageElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
          });
        }
      }, 100);
    }
    setShouldAutoScroll(false);
  }, [messages, shouldAutoScroll, isUserScrolling]);

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
    setShouldAutoScroll(true); // Trigger scroll for initial user message
    await supabase.from('messages').insert(userMsg);
    setLoading(true);

    // Prepare assistant placeholder
    setMessages((m) => [...m, { user_id: userId, role: 'assistant', content: '' }]);
    // Note: Don't set shouldAutoScroll here - we don't want to scroll for AI messages

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

  // Auto-scroll para mostrar el mensaje del usuario en la parte superior
  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      // Find the LAST USER message (not just the last message)
      let lastUserMessageIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserMessageIndex = i;
          break;
        }
      }
      
      if (lastUserMessageIndex !== -1) {
        // Usar setTimeout para asegurar que el DOM se haya actualizado
        setTimeout(() => {
          // Buscar el elemento del mensaje del usuario por índice
          const messageElements = document.querySelectorAll('[data-message-index]');
          const userMessageElement = messageElements[lastUserMessageIndex] as HTMLElement;
          
          if (userMessageElement) {
            userMessageElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' // Posiciona el mensaje del usuario en la parte superior
            });
          }
        }, 100);
      }
      setShouldAutoScroll(false);
    }
  }, [messages, shouldAutoScroll]);
  
  // Scroll para mostrar la respuesta de la IA cuando está generando
  useEffect(() => {
    if (loading && messages.length > 0) {
      // Solo hacer scroll si el último mensaje es del asistente
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [loading, messages.length]);

  // Scroll inicial al cargar la página
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, [messages.length]);

  async function streamChat(
    messages: Message[],
    onDelta: (delta: string) => void,
    onError?: (error: Error) => void
  ) {
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptStream = async (): Promise<void> => {
      try {
        await fetchEventSource('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages }),
          onopen: async (res) => {
            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errorText}`);
            }
          },
          onmessage: (ev) => {
            if (ev.data === '[DONE]') return;
            try {
              const data = JSON.parse(ev.data);
              if (data.content) {
                onDelta(data.content);
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          },
          onerror: (err) => {
            console.error('Stream error:', err);
            throw err;
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying stream (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return attemptStream();
        } else {
          console.error('Max retries reached for stream');
          if (onError) {
            onError(error as Error);
          }
          throw error;
        }
      }
    };
    
    return attemptStream();
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const messageContent = input.trim();
    setInput('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // 1️⃣ Insert user message
      const userMsg: Message = { user_id: userId, role: 'user', content: messageContent };
      
      // Update state and get the current messages
      let currentMessages: Message[] = [];
      setMessages((prev) => {
        currentMessages = [...prev, userMsg];
        return currentMessages;
      });
      setShouldAutoScroll(true);
      
      const { error: insertError } = await supabase.from('messages').insert(userMsg);
      if (insertError) {
        console.error('Error inserting user message:', insertError);
        setMessages((m) => m.slice(0, -1));
        setInput(messageContent);
        return;
      }
      
      setLoading(true);

      // 2️⃣ Prepare assistant placeholder
      setMessages((prev) => [...prev, { user_id: userId, role: 'assistant', content: '' }]);

      // 3️⃣ Stream from API - use currentMessages instead of stale state
      let assistantContent = '';
      
      await streamChat(currentMessages, (delta) => {
        assistantContent += delta;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...last, content: assistantContent },
            ];
          }
          return prev;
        });
      }, (error) => {
        // Handle stream errors properly
        console.error('Stream failed:', error);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...last, content: 'Error: No se pudo establecer la conexión. Por favor, intenta de nuevo.' },
            ];
          }
          return prev;
        });
      });
      
      // Only save if we got content
      if (assistantContent.trim()) {
        // 4️⃣ Process JSON resumen if present
        try {
          let parsedJson;
          try {
            parsedJson = JSON.parse(assistantContent.trim());
          } catch {
            const jsonMatch = assistantContent.match(/{[\s\S]*"resumen"[\s\S]*}/);
            if (jsonMatch) {
              parsedJson = JSON.parse(jsonMatch[0]);
            }
          }
          
          if (parsedJson && parsedJson.resumen) {
            const response = await fetch('/api/resumen', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
        const { error: assistantInsertError } = await supabase.from('messages').insert({
          user_id: userId,
          role: 'assistant',
          content: assistantContent,
        });
        
        if (assistantInsertError) {
          console.error('Error inserting assistant message:', assistantInsertError);
        }
      }
      
    } catch (err) {
      console.error('Error in handleSendMessage:', err);
      setMessages((m) => [
        ...m,
        { user_id: userId, role: 'assistant', content: 'Error: No se pudo establecer la conexión. Por favor, intenta de nuevo.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Chat Header - fixed at top */}
      <div className="flex-none flex items-center justify-between py-4 px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src="/images/rutea-avatar.png" alt="Maria Rutea" />
            <AvatarFallback className="text-lg">MR</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Maria Rutea
              </h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary" 
                    className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 cursor-pointer"
                  >
                    Beta
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Función en prueba — si falla, refresca la página para seguir.</p>
                </TooltipContent>
              </Tooltip>
            </div>
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
      
      {/* Chat content - scrollable area */}
      <div className="flex-grow overflow-y-auto h-0 min-h-0" ref={scrollAreaRef}>
        <div className="space-y-4 p-4 w-full">
          {messages.map((msg, index) => (
            <div
              key={index}
              data-message-index={index}
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
      </div>
        
      {/* Chat input - fixed at bottom */}
      <div className="flex-none p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage}>
          <div className="relative flex items-end bg-white border border-gray-300 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-200 focus-within:border-gray-400 focus-within:shadow-md">
            <textarea
              ref={textareaRef}
              placeholder="Pregunta lo que quieras"
              className="flex-1 min-h-[24px] max-h-[200px] resize-none bg-transparent px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 border-none outline-none leading-6"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              rows={1}
              autoFocus
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
    </div>
  );
});


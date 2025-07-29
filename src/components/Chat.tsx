'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { fetchEventSource } from '@microsoft/fetch-event-source';

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch chat history from Supabase
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        const fetchedMessages = data || [];
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
        { user_id: userId, role: 'assistant', content: 'Error: Could not stream.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

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
        { user_id: userId, role: 'assistant', content: 'Error: Could not stream.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[80vh] w-full max-w-3xl">
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <Avatar>
                  <AvatarImage src="/images/rutea-avatar.png" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`rounded-lg p-3 max-w-[70%] ${
                  msg.role === 'user'
                    ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                    : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <Avatar>
                  <AvatarFallback className="bg-indigo-100 text-indigo-900 font-semibold">
                    {userEmail.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <form onSubmit={handleSendMessage} className="flex p-4 gap-2">
        <textarea
          placeholder="Type your message..."
          className="flex-1 min-h-[2.5rem] max-h-[80px] resize-none overflow-y-auto p-2 border rounded-md leading-normal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </form>
    </div>
  );
}
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchEventSource } from '@microsoft/fetch-event-source';

// Add the Message interface
interface Message {
  id?: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  streamingMessage: string;
}

type ChatAction = 
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_STREAMING'; payload: string }
  | { type: 'RESET_STREAM' };

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload, error: null };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'UPDATE_STREAMING':
      return { ...state, streamingMessage: action.payload };
    case 'RESET_STREAM':
      return { ...state, streamingMessage: '', loading: false };
    default:
      return state;
  }
};

const ChatContext = createContext<{
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  sendMessage: (content: string) => Promise<void>;
} | null>(null);

export function ChatProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    loading: false,
    error: null,
    streamingMessage: ''
  });

  // Stream chat function
  const streamChat = async (
    messages: Message[],
    onDelta: (delta: string) => void
  ) => {
    await fetchEventSource('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      onopen: async (res) => {
        if (!res.ok) throw new Error('Failed to open stream');
      },
      onmessage: (ev) => {
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
  };

  // Send initial message function
  const sendInitialMessage = useCallback(async () => {
    const initialPrompt = "¿Me orientas en mi busqueda profesional? Primero cuentame como puedo empezar este ejercicio";
    
    try {
      // Insert initial user message
      const userMsg: Message = { user_id: userId, role: 'user', content: initialPrompt };
      dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
      await supabase.from('messages').insert(userMsg);
      dispatch({ type: 'SET_LOADING', payload: true });
  
      // Prepare assistant placeholder
      const assistantMsg: Message = { user_id: userId, role: 'assistant', content: '' };
      dispatch({ type: 'ADD_MESSAGE', payload: assistantMsg });
  
      // Stream from API
      let assistantContent = '';
      await streamChat([userMsg], (delta) => {
        assistantContent += delta;
        dispatch({ type: 'UPDATE_STREAMING', payload: assistantContent });
      });
      
      // Save complete assistant message
      const completeAssistantMsg: Message = {
        user_id: userId,
        role: 'assistant',
        content: assistantContent,
      };
      
      await supabase.from('messages').insert(completeAssistantMsg);
      dispatch({ type: 'RESET_STREAM' });
    } catch (err) {
      console.error(err);
      dispatch({ type: 'SET_ERROR', payload: 'Error: No se pudo establecer la conexión.' });
    }
  },[]);

  // Single source of truth for message management
  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel> | null = null;
    
    const setupChat = async () => {
      try {
        // Fetch existing messages
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        dispatch({ type: 'SET_MESSAGES', payload: data || [] });
        
        // Setup real-time subscription
        subscription = supabase
          .channel('messages')
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${userId}` },
            (payload) => {
              dispatch({ type: 'ADD_MESSAGE', payload: payload.new as Message });
            }
          )
          .subscribe();
          
        // Send initial message if no messages exist
        if (!data || data.length === 0) {
          await sendInitialMessage();
        }
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      }
    };

    setupChat();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [userId, sendInitialMessage]); // Add sendInitialMessage to dependencies

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    try {
      // Add user message
      const userMsg: Message = { user_id: userId, role: 'user', content };
      dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
      await supabase.from('messages').insert(userMsg);
      
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Prepare assistant placeholder
      const assistantMsg: Message = { user_id: userId, role: 'assistant', content: '' };
      dispatch({ type: 'ADD_MESSAGE', payload: assistantMsg });
      
      // Stream response
      let assistantContent = '';
      await streamChat([...state.messages, userMsg], (delta) => {
        assistantContent += delta;
        dispatch({ type: 'UPDATE_STREAMING', payload: assistantContent });
      });
      
      // Save complete assistant message
      const completeAssistantMsg: Message = {
        user_id: userId,
        role: 'assistant',
        content: assistantContent,
      };
      
      await supabase.from('messages').insert(completeAssistantMsg);
      dispatch({ type: 'RESET_STREAM' });
      
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al enviar el mensaje. Intenta de nuevo.' });
    }
  };

  return (
    <ChatContext.Provider value={{ state, dispatch, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
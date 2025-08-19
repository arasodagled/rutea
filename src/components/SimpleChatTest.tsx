'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function SimpleChatTest() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    setIsLoading(true);
    setMessages(prev => [...prev, `User: ${message}`]);

    try {
      console.log('Sending simple message:', message);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: message }] 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let assistantMessage = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantMessage += parsed.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  if (newMessages[newMessages.length - 1]?.startsWith('Assistant:')) {
                    newMessages[newMessages.length - 1] = `Assistant: ${assistantMessage}`;
                  } else {
                    newMessages.push(`Assistant: ${assistantMessage}`);
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
      
      console.log('Simple message sent successfully');
    } catch (error) {
      console.error('Error in simple chat:', error);
      setMessages(prev => [...prev, `Error: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Please log in to test chat</div>;
  }

  return (
    <div className="max-w-md mx-auto p-4 border rounded-lg">
      <h2 className="text-lg font-bold mb-4">Simple Chat Test</h2>
      
      <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className="text-sm p-2 bg-gray-100 rounded">
            {msg}
          </div>
        ))}
        {isLoading && <div className="text-sm text-gray-500">Loading...</div>}
      </div>
      
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Send
        </button>
      </form>
      
      <div className="mt-4 text-xs text-gray-500">
        <div>User ID: {user.id}</div>
        <div>Tab Hidden: {document.hidden ? 'Yes' : 'No'}</div>
      </div>
    </div>
  );
}

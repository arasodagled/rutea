'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';

export function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const { user, loading: authLoading, isConnected: authConnected } = useAuth();
  const { state: chatState, uiState } = useChat();
  
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  const [lastAction, setLastAction] = useState<string>('');

  useEffect(() => {
    const handleVisibilityChange = () => {
      setTabVisible(!document.hidden);
      setLastAction(`Tab ${document.hidden ? 'hidden' : 'visible'} at ${new Date().toLocaleTimeString()}`);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const testMessage = async () => {
    setLastAction(`Test message sent at ${new Date().toLocaleTimeString()}`);
    // This will be handled by the Chat component
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full z-50"
      >
        🐛
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Debug Panel</h3>
        <button onClick={() => setIsVisible(false)} className="text-gray-500">×</button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Auth:</strong> {authLoading ? 'Loading' : user ? 'Logged in' : 'Not logged in'}
        </div>
        <div>
          <strong>Auth Connected:</strong> {authConnected ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Tab Visible:</strong> {tabVisible ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>UI State:</strong> {uiState.state}
        </div>
        <div>
          <strong>Chat Connected:</strong> {chatState.isConnected ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Messages:</strong> {chatState.messages.length}
        </div>
        <div>
          <strong>Last Action:</strong> {lastAction}
        </div>
        
        <button
          onClick={testMessage}
          className="w-full bg-green-500 text-white p-2 rounded text-xs"
        >
          Test Message Send
        </button>
      </div>
    </div>
  );
}

'use client';

import { Chat } from '@/components/Chat';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function ChatWrapper() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <div>Please log in to access the chat.</div>
        <Button 
          onClick={() => router.push('/login')}
          variant="default"
        >
          Log in
        </Button>
      </div>
    );
  }

  return <Chat userId={user.id} userEmail={user.email || ''} />;
}

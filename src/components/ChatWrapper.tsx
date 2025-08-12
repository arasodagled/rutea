'use client';

import { useEffect, useState } from 'react';
import { Chat } from '@/components/Chat';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function ChatWrapper() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      console.log('ChatWrapper - Retrieved user:', user);
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {

        console.log('Auth state changed:', event, session?.user);
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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

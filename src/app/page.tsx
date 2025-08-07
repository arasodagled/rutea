'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error);
          // Clear any invalid tokens
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        if (session?.user) {
          // Check user profile to determine where to redirect
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('is_first_login, cv_file_path')
            .eq('user_id', session.user.id)
            .single();

          if (profile?.is_first_login || !profile?.cv_file_path) {
            router.push('/new-user');
          } else {
            router.push('/chat-onboarding');
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Unexpected auth error:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  // Show loading state while checking authentication
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { LoadingIndicator } from '@/components/LoadingIndicator';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Don't render sidebar if user is not logged in
  const showSidebar = user !== null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Global loading indicator wrapped in Suspense */}
      <Suspense fallback={null}>
        <LoadingIndicator />
      </Suspense>
      
      {/* Main layout container */}
      <div className="flex h-screen">
        {/* Sidebar - only show when user is logged in */}
        {showSidebar && (
          <Sidebar 
            isOpen={isSidebarOpen} 
            onToggle={toggleSidebar}
            onMobileMenuToggle={toggleSidebar}
          />
        )}
        
        {/* Main content */}
        <main className={`flex-1 relative overflow-y-auto flex flex-col ${!showSidebar ? 'w-full' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
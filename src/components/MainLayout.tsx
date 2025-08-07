'use client';

import { useState, useEffect } from 'react';
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
      {/* Global loading indicator */}
      <LoadingIndicator />
      
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
        <main className={`flex-1 relative overflow-auto ${!showSidebar ? 'w-full' : ''}`}>
          {/* Mobile menu button - only show when user is logged in and sidebar is closed */}
          {showSidebar && (
            <button
               onClick={toggleSidebar}
               className={`lg:hidden fixed top-4 left-4 z-40 p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-opacity duration-300 ${
                 isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
               }`}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
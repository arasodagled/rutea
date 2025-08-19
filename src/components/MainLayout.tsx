'use client';

import { useState, Suspense } from 'react';
import { Sidebar, MobileMenuButton } from '@/components/Sidebar';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { useAuth } from '@/contexts/AuthContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, loading } = useAuth();

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
          {/* Add mobile menu button for logged-in users with reduced padding */}
          {showSidebar && (
            <div className="py-2 px-4 flex items-center lg:hidden">
              <MobileMenuButton onClick={toggleSidebar} />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
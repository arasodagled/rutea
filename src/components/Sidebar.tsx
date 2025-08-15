'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { Menu, X, Users, Brain, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onMobileMenuToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      // Check if user is admin
      if (session?.user) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('user_type')
          .eq('user_id', session.user.id)
          .single();
        
        setIsAdmin(userProfile?.user_type === 'admin');
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        // Check if user is admin when auth state changes
        if (session?.user) {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('user_type')
            .eq('user_id', session.user.id)
            .single();
          
          setIsAdmin(userProfile?.user_type === 'admin');
        } else {
          setIsAdmin(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple clicks
    
    setIsSigningOut(true);
    toast.loading('Signing out...', { id: 'signout' });
    
    try {
      // First attempt to sign out with Supabase
      await supabase.auth.signOut();
      
      // Then clear all storage and state
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setIsAdmin(false);
      
      // Force a hard redirect after successful sign-out
      window.location.href = '/login';
      toast.success('Signed out successfully', { id: 'signout' });
    } catch (error) {
      console.error('Sign out error:', error);
      
      // Fallback: clear storage and redirect anyway
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setIsAdmin(false);
      
      window.location.href = '/login';
      toast.success('Signed out successfully', { id: 'signout' });
    }
  };

  const navigationItems = [
    // Only show User Management to admins
    ...(isAdmin ? [{
      name: 'User Management',
      href: '/users',
      icon: Users,
      isActive: pathname === '/users' || pathname.startsWith('/users/')
    }] : []),
    {
      name: 'Autoconocimiento',
      href: '/chat-onboarding',
      icon: Brain,
      isActive: pathname === '/chat-onboarding'
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-300 ease-in-out flex flex-col
        lg:relative lg:translate-x-0 lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar header */}
        <div className="flex-none flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <Link href="/" onClick={onToggle} data-nav="true">
            <Image src="/images/rutea-logo-color.svg" alt="Rutea" width={96} height={32} className="h-8 w-auto" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation - make it scrollable if needed */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onToggle}
                  data-nav="true"
                  className={`
                    flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                    ${item.isActive 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {item.icon && <item.icon className="h-5 w-5" />}
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section - ensure it's always visible */}
        {user && (
          <div className="flex-none p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Signed in as:</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user.email}
              </p>
            </div>
            <Button 
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              disabled={isSigningOut}
              data-nav="true"
            >
              {isSigningOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </>
              )}
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}

// Mobile menu button component
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="lg:hidden"
      //data-nav="true"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

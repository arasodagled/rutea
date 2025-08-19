'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, Users, Brain, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onMobileMenuToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Refs to prevent excessive API calls and flickering
  const adminCheckTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastAdminCheckRef = useRef<string>(''); // Store user ID to prevent unnecessary checks
  const adminStatusCacheRef = useRef<Map<string, boolean>>(new Map());

  // Debounced admin status check to prevent flickering
  const checkAdminStatus = useCallback(async (userId: string) => {
    // Don't check if we've checked this user recently
    if (lastAdminCheckRef.current === userId) {
      return;
    }

    // Check cache first
    if (adminStatusCacheRef.current.has(userId)) {
      setIsAdmin(adminStatusCacheRef.current.get(userId)!);
      lastAdminCheckRef.current = userId;
      return;
    }

    setIsCheckingAdmin(true);
    
    try {
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        adminStatusCacheRef.current.set(userId, false);
      } else {
        const adminStatus = userProfile?.user_type === 'admin';
        console.log('Admin status updated:', { userId, adminStatus, userType: userProfile?.user_type });
        setIsAdmin(adminStatus);
        adminStatusCacheRef.current.set(userId, adminStatus);
      }
      
      lastAdminCheckRef.current = userId;
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      adminStatusCacheRef.current.set(userId, false);
      lastAdminCheckRef.current = userId;
    } finally {
      setIsCheckingAdmin(false);
    }
  }, []);

  useEffect(() => {
    // Clear any existing timeout
    if (adminCheckTimeoutRef.current) {
      clearTimeout(adminCheckTimeoutRef.current);
    }

    if (user?.id) {
      // Debounce the admin check to prevent rapid calls
      adminCheckTimeoutRef.current = setTimeout(() => {
        checkAdminStatus(user.id);
      }, 100); // 100ms debounce
    } else {
      // Clear admin status when no user
      setIsAdmin(false);
      lastAdminCheckRef.current = '';
    }

    return () => {
      if (adminCheckTimeoutRef.current) {
        clearTimeout(adminCheckTimeoutRef.current);
      }
    };
  }, [user?.id, checkAdminStatus]);

  // Clear admin status when user signs out
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      lastAdminCheckRef.current = '';
    }
  }, [user]);

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple clicks
    
    setIsSigningOut(true);
    toast.loading('Signing out...', { id: 'signout' });
    
    try {
      await signOut();
      // AuthContext will handle the rest
      toast.success('Signed out successfully', { id: 'signout' });
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out', { id: 'signout' });
    } finally {
      setIsSigningOut(false);
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
              {/* Show admin status indicator */}
              {isCheckingAdmin && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Checking permissions...
                </p>
              )}
              {!isCheckingAdmin && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isAdmin ? 'Admin user' : 'Regular user'}
                </p>
              )}
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

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function LoadingIndicator() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // When the route changes, set loading to false
    setIsLoading(false);
  }, [pathname, searchParams]);

  // Create a global event listener for navigation start
  useEffect(() => {
    const handleRouteChangeStart = () => {
      setIsLoading(true);
    };

    // Add event listeners for click events on navigation elements
    const handleNavClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const navLink = target.closest('a');
      const navButton = target.closest('button');
      
      // Check if the clicked element is a navigation link or button
      if (navLink) {
        const href = navLink.getAttribute('href');
        if (href && !href.startsWith('#')) {
          setIsLoading(true);
        }
      } else if (navButton && navButton.dataset.nav === 'true') {
        setIsLoading(true);
      }
    };

    document.addEventListener('click', handleNavClick);

    return () => {
      document.removeEventListener('click', handleNavClick);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent overflow-hidden">
      <div className="h-full bg-blue-600 animate-loading-bar"></div>
    </div>
  );
}
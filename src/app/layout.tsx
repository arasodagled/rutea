import './globals.css';
import { Inter } from 'next/font/google';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'ChatGPT-like Web App',
  description: 'A minimal, modern ChatGPT-like web app MVP',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // Cookie modifications are not allowed in Server Components
        },
        remove() {
          // Cookie modifications are not allowed in Server Components
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4 border-b bg-white dark:bg-gray-900">
          <Link href="/">
            <img src="/images/rutea-logo-color.svg" alt="Rutea" className="h-8" />
          </Link>
          <nav>
            {user ? (
              <form action="/auth/sign-out" method="post">
                <Button type="submit">Sign Out</Button>
              </form>
            ) : (
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

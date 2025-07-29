import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Chat } from '@/components/Chat';

export default async function ChatOnboarding() {
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

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen pt-20 p-4">
      <Chat userId={user.id} userEmail={user.email || ''} />
    </main>
  );
}
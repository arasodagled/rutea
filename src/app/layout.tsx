import './globals.css';
import { Inter } from 'next/font/google';
import { MainLayout } from '@/components/MainLayout';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Rutea',
  description: 'Coach de Carrera',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <AuthProvider>
          <MainLayout>
            {children}
          </MainLayout>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

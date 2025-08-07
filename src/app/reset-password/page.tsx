'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if this is a password reset callback with tokens
  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    
    if (tokenHash && type === 'recovery') {
      // Redirect to confirm page with the tokens
      const confirmUrl = `/reset-password/confirm?${searchParams.toString()}`;
      router.replace(confirmUrl);
      return;
    }
  }, [searchParams, router]);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage('Please enter your email address');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Reset password error:', error);
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Check your email for the password reset link!');
        setEmail('');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setMessage(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
          
          {message && (
            <div className={`mt-4 p-3 rounded text-center ${
              message.includes('Error')
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-green-100 text-green-700 border border-green-300'
            }`}>
              {message}
            </div>
          )}
          
          <div className="mt-4 text-center">
            <Button 
              variant="link" 
              onClick={() => router.push('/login')}
              className="text-sm"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
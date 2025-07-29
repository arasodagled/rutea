'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showResendOption, setShowResendOption] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    let error = null;
    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      error = signInError;
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      error = signUpError;
    }

    if (error) {
      setMessage(error.message);
      setShowResendOption(false);
    } else {
      if (isLogin) {
        router.push('/');
      } else {
        setMessage('Success! Check your email for verification. The link expires in 1 hour.');
        setShowResendOption(true);
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Password reset email sent. Check your inbox.');
    }
    setLoading(false);
  };

  const handleResendVerification = async () => {
    if (!email) {
      setMessage('Please enter your email address first.');
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('New verification email sent! Please check your inbox and click the link within 1 hour.');
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">{isLogin ? 'Login' : 'Sign Up'}</CardTitle>
        <CardDescription>
          {isLogin ? 'Enter your email below to login to your account.' : 'Enter your email below to create an account.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
          </Button>
          {message && <p className="text-center text-sm text-red-500">{message}</p>}
        </form>
        <div className="mt-4 text-center text-sm">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <Button variant="link" onClick={() => setIsLogin(false)} className="p-0 h-auto">
                Sign up
              </Button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Button variant="link" onClick={() => setIsLogin(true)} className="p-0 h-auto">
                Login
              </Button>
            </>
          )}
          <Button variant="link" onClick={handleForgotPassword} className="p-0 h-auto ml-4">
            Forgot password?
          </Button>
        </div>
        {showResendOption && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Didn't receive the email or link expired?
            </p>
            <Button 
              variant="outline" 
              onClick={handleResendVerification} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Sending...' : 'Resend Verification Email'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
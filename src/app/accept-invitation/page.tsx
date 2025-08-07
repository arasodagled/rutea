'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function AcceptInvitationPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyInvitation = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      
      if (!token_hash || type !== 'invite') {
        setError('Invalid invitation link');
        setVerifying(false);
        return;
      }

      try {
        console.log('🔄 Verifying invitation token...');
        
        // This is the key: verifyOtp establishes the session automatically
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          type: 'invite',
          token_hash,
        });

        if (verifyError) {
          console.error('❌ Invitation verification error:', verifyError);
          setError('Invalid or expired invitation link');
        } else if (data.user && data.session) {
          console.log('✅ Invitation verified and session established');
          console.log('Session:', data.session);
          console.log('User:', data.user);
          
          // Store invitation data from user metadata
          setInvitationData({
            email: data.user.email,
            firstName: data.user.user_metadata?.first_name || '',
            lastName: data.user.user_metadata?.last_name || '',
          });
        }
      } catch (err) {
        console.error('💥 Error verifying invitation:', err);
        setError('Failed to verify invitation');
      } finally {
        setVerifying(false);
      }
    };

    verifyInvitation();
  }, [searchParams]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true); // Changed from setIsLoading
    
    try {
      console.log('🔄 Setting password...');
      
      // Call our API endpoint that handles everything server-side
      const response = await fetch('/api/complete-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invitationData?.email, // Changed from userEmail
          password: password
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to complete invitation');
      }
      
      console.log('✅ Invitation completed successfully');
      toast.success('Welcome! Your account has been set up successfully.');
      
      // Sign in the user automatically
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: password
      });
      
      if (signInError) {
        console.error('Auto sign-in failed:', signInError);
        router.push('/login?message=password-set-please-login');
        return;
      }
      
      // Redirect to new user page
      setTimeout(() => {
        router.push('/new-user');
      }, 1500);
      
    } catch (error) {
      console.error('❌ Password setup failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to set password');
    } finally {
      setLoading(false); // Changed from setIsLoading
    }
  };

  if (verifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Verifying invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-red-600">Invitation Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/login')} 
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set Your Password</CardTitle>
          <CardDescription>
            Welcome {invitationData?.firstName} {invitationData?.lastName}! 
            Please set a password for your account: {invitationData?.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={6}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Setting Password...' : 'Set Password & Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

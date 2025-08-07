'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Add the missing state variables
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userType, setUserType] = useState('user'); // Add userType state
  const [showPassword, setShowPassword] = useState(false);
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
      // Direct signup with user profile creation
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: firstName,
            last_name: lastName,
            signup_type: 'direct' // Flag to identify direct signup
          },
        },
      });
      
      if (!signUpError && authData.user) {
        // Create user profile immediately for direct signups
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            first_name: firstName,
            last_name: lastName,
            user_type: userType, // Use selected userType instead of hardcoded 'user'
            status: 'active'
          });
        
        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
      }
      
      error = signUpError;
    }

    if (error) {
      setMessage(error.message);
      setShowResendOption(false);
    } else {
      if (isLogin) {
        // Force a page refresh to ensure session is properly set
        window.location.href = '/chat-onboarding';
      } else {
        setMessage('Success! Check your email for verification. The link expires in 1 hour.');
        setShowResendOption(true);
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    // Instead of sending email directly, redirect to reset-password page
    router.push('/reset-password');
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
        <CardTitle className="text-2xl">{isLogin ? "Login" : "Sign Up"}</CardTitle>
        <CardDescription>
          {isLogin ? 'Enter your email below to login to your account.' : 'Enter your email below to create an account.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          {!isLogin && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="userType">User Type</Label>
                <Select value={userType} onValueChange={setUserType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
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
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
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
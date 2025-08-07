'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export default function ConfirmPasswordReset() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const verifyToken = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      
      // First check if parameters are valid
      if (!tokenHash || type !== 'recovery') {
        setMessage('Invalid or missing recovery parameters');
        setIsChecking(false);
        return;
      }
      
      try {
        // Check for an existing session first
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // If we already have a session, we're authenticated and can proceed
          console.log('User already has a valid session');
          setIsReady(true);
          setIsChecking(false);
          return;
        }
        
        // Only attempt to verify the token if we don't have a session
        console.log('No session found, attempting to verify token');
        const { error } = await supabase.auth.verifyOtp({
          type: 'recovery',
          token_hash: tokenHash,
        });
        
        if (error) {
          console.error('Token verification failed:', error.message);
          setMessage('Invalid or expired reset link. Please request a new one.');
          setIsChecking(false);
          return;
        }
        
        // Check if verification created a session
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (newSession) {
          console.log('New session created after token verification');
          setIsReady(true);
        } else {
          console.error('No session created after successful token verification');
          setMessage('Unable to establish session. Please try again or request a new link.');
        }
      } catch (error) {
        console.error('Error during password reset flow:', error);
        setMessage('An unexpected error occurred. Please try again.');
      } finally {
        setIsChecking(false);
      }
    };
    
    verifyToken();
  }, [searchParams]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(`Error updating password: ${error.message}`);
      } else {
        setMessage('✅ Password updated successfully! Redirecting to login...');
        setTimeout(() => {
          window.location.replace('/login');
        }, 2000); // 2 seconds delay
        return;
      }
    } catch (err) {
      setMessage(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Processing reset link...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we verify your reset link.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Invalid Link
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {message || 'This password reset link is invalid or has expired.'}
            </p>
            <button
              onClick={() => router.push('/reset-password')}
              className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Request New Reset Link
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set New Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handlePasswordReset}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
          
          {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              message.includes('successfully') 
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthCodeErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-red-600">Authentication Error</CardTitle>
          <CardDescription>
            There was an error processing your email verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This could happen if:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
            <li><strong>The verification link has expired</strong> (links expire after 1 hour)</li>
            <li>The link has already been used</li>
            <li>There was a network error</li>
          </ul>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Most common issue:</strong> Email verification links expire after 1 hour. 
              If you waited too long to click the link, you'll need to request a new one.
            </p>
          </div>
          <div className="flex flex-col space-y-2">
            <Link href="/login">
              <Button className="w-full">
                Go to Login/Signup Page
              </Button>
            </Link>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              On the signup form, you can request a new verification email
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
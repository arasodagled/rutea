'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function MakeAdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleMakeAdmin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/make-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);

      if (response.ok) {
        toast.success(data.message || 'Admin status granted successfully!');
      } else {
        toast.error(data.error || 'Failed to grant admin status');
      }
    } catch (error) {
      console.error('Error making admin:', error);
      toast.error('Error granting admin status');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAuth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-auth');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error checking auth:', error);
      toast.error('Error checking authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Admin Setup</CardTitle>
          <CardDescription>
            Use this page to grant admin privileges to your account and debug authentication issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={handleMakeAdmin} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Make Me Admin'}
            </Button>
            <Button 
              onClick={handleCheckAuth} 
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? 'Checking...' : 'Check Auth Status'}
            </Button>
          </div>
          
          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Result:</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h4 className="font-semibold text-blue-900 mb-2">Instructions:</h4>
            <ol className="list-decimal list-inside text-blue-800 space-y-1">
              <li>First, click "Check Auth Status" to see your current authentication state</li>
              <li>If you're logged in but not an admin, click "Make Me Admin"</li>
              <li>After becoming admin, you should be able to invite users</li>
              <li>If you still have issues, try logging out and logging back in</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
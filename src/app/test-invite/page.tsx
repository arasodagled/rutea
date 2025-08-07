'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function TestInvitePage() {
  const [loading, setLoading] = useState(false);
  const [authResult, setAuthResult] = useState<any>(null);
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [email, setEmail] = useState('test@example.com');
  const [firstName, setFirstName] = useState('Test');
  const [lastName, setLastName] = useState('User');

  const handleCheckAuth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-auth');
      const data = await response.json();
      setAuthResult(data);
      
      if (data.isAdmin) {
        toast.success('You are authenticated as admin!');
      } else {
        toast.warning('You are not authenticated as admin');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      toast.error('Error checking authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleTestInvite = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
        }),
      });

      const data = await response.json();
      setInviteResult({ status: response.status, data });

      if (response.ok) {
        toast.success('Invitation sent successfully!');
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Error sending invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Authentication & Invite Test</CardTitle>
          <CardDescription>
            Test your authentication status and invite functionality.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auth Check Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">1. Check Authentication</h3>
            <Button 
              onClick={handleCheckAuth} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Checking...' : 'Check Auth Status'}
            </Button>
            
            {authResult && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Auth Result:</h4>
                <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-64">
                  {JSON.stringify(authResult, null, 2)}
                </pre>
                <div className="mt-2 p-3 rounded-md bg-blue-50">
                  <p><strong>Status:</strong> {authResult.user ? "Logged In" : "Not Logged In"}</p>
                  <p><strong>Admin:</strong> {authResult.isAdmin ? "Yes" : "No"}</p>
                  <p><strong>User Type:</strong> {authResult.profile?.user_type || "N/A"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Invite Test Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">2. Test Invite Functionality</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            
            <Button 
              onClick={handleTestInvite} 
              disabled={loading || !email || !firstName || !lastName}
              className="w-full"
            >
              {loading ? 'Sending...' : 'Test Send Invitation'}
            </Button>
            
            {inviteResult && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Invite Result:</h4>
                <div className={`p-3 rounded-md ${
                  inviteResult.status === 200 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <p><strong>Status Code:</strong> {inviteResult.status}</p>
                  <p><strong>Success:</strong> {inviteResult.status === 200 ? "Yes" : "No"}</p>
                </div>
                <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-64 mt-2">
                  {JSON.stringify(inviteResult.data, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-md">
            <h4 className="font-semibold text-yellow-900 mb-2">Troubleshooting:</h4>
            <ul className="list-disc list-inside text-yellow-800 space-y-1">
              <li>If auth shows you&apos;re not admin, the database user_type field might not be &apos;admin&apos;</li>
              <li>If invite fails with 401, there&apos;s a session/cookie issue</li>
              <li>If invite fails with 403, your user_type is not &apos;admin&apos; in the database</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
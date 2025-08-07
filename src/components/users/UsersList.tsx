'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  full_name: string | null
  status: 'pending' | 'active'
  is_admin: boolean
  created_at: string
  updated_at: string
  expires_at: string | null
  invited_by: {
    full_name: string | null
    email: string
  } | null
  type: 'invitation' | 'user'
}

interface UsersResponse {
  users: User[]
  summary: {
    total: number
    pending: number
    active: number
  }
}

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([])
  const [summary, setSummary] = useState({ total: 0, pending: 0, active: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data: UsersResponse = await response.json()
      setUsers(data.users)
      setSummary(data.summary)
      setError(null)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const getStatusBadge = (user: User) => {
    if (user.status === 'pending') {
      const isExpired = user.expires_at && new Date(user.expires_at) < new Date()
      return (
        <Badge variant={isExpired ? 'destructive' : 'secondary'}>
          {isExpired ? 'Expired' : 'Pending'}
        </Badge>
      )
    }
    return <Badge variant="default">Active</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const resendInvitation = async (invitationId: string, email: string) => {
    try {
      const response = await fetch('/api/resend-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, email })
      })

      if (!response.ok) {
        throw new Error('Failed to resend invitation')
      }

      toast.success('Invitation resent successfully')
      fetchUsers() // Refresh the list
    } catch (err) {
      console.error('Error resending invitation:', err)
      toast.error('Failed to resend invitation')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading users...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error: {error}
            <Button 
              onClick={fetchUsers} 
              variant="outline" 
              className="ml-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No users found
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div 
                  key={`${user.type}-${user.id}`} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-medium">
                          {user.full_name || user.email}
                        </h3>
                        {user.full_name && (
                          <p className="text-sm text-gray-600">{user.email}</p>
                        )}
                      </div>
                      {getStatusBadge(user)}
                      {user.is_admin && (
                        <Badge variant="outline">Admin</Badge>
                      )}
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-500">
                      {user.type === 'invitation' ? (
                        <>
                          Invited {formatDate(user.created_at)}
                          {user.invited_by && (
                            <> by {user.invited_by.full_name || user.invited_by.email}</>
                          )}
                          {user.expires_at && (
                            <> • Expires {formatDate(user.expires_at)}</>
                          )}
                        </>
                      ) : (
                        <>Joined {formatDate(user.created_at)}</>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {user.type === 'invitation' && user.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resendInvitation(user.id, user.email)}
                      >
                        Resend
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
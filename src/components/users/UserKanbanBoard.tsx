'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Eye, Mail, Calendar, User } from 'lucide-react'
import Link from 'next/link'

interface User {
  id: string
  user_id?: string  // Add this field
  email: string
  full_name: string | null
  status: 'pending' | 'active' | 'inactive' | 'completed'
  user_type: 'admin' | 'user' | 'candidate'
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

const statusConfig = {
  pending: {
    title: 'Pendiente',
    color: 'bg-yellow-50 border-yellow-200',
    headerColor: 'bg-yellow-100 text-yellow-800',
    badgeVariant: 'secondary' as const
  },
  active: {
    title: 'Activo',
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-100 text-green-800',
    badgeVariant: 'default' as const
  },
  inactive: {
    title: 'Inactivo',
    color: 'bg-gray-50 border-gray-200',
    headerColor: 'bg-gray-100 text-gray-800',
    badgeVariant: 'outline' as const
  },
  completed: {
    title: 'Completado',
    color: 'bg-blue-50 border-blue-200',
    headerColor: 'bg-blue-100 text-blue-800',
    badgeVariant: 'default' as const
  }
}

export default function UserKanbanBoard() {
  const router = useRouter()
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  const groupedUsers = users.reduce((acc, user) => {
    const status = user.status as keyof typeof statusConfig
    if (!acc[status]) {
      acc[status] = []
    }
    acc[status].push(user)
    return acc
  }, {} as Record<string, User[]>)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
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
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="h-16">
          <CardContent className="px-4 py-2 h-full flex items-center">
            <div>
              <p className="text-xs font-medium text-gray-600">Total de Usuarios</p>
              <p className="text-lg font-bold">{summary.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="h-16">
          <CardContent className="px-4 py-2 h-full flex items-center">
            <div>
              <p className="text-xs font-medium text-gray-600">Usuarios Activos</p>
              <p className="text-lg font-bold text-green-600">{summary.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="h-16">
          <CardContent className="px-4 py-2 h-full flex items-center">
            <div>
              <p className="text-xs font-medium text-gray-600">Invitaciones Pendientes</p>
              <p className="text-lg font-bold text-yellow-600">{summary.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="h-16">
          <CardContent className="px-4 py-2 h-full flex items-center">
            <div>
              <p className="text-xs font-medium text-gray-600">Usuarios Inactivos</p>
              <p className="text-lg font-bold text-gray-600">
                {groupedUsers.inactive?.length || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {Object.entries(statusConfig).map(([status, config]) => {
          const statusUsers = groupedUsers[status] || []
          
          return (
            <div key={status} className={`rounded-lg border-2 ${config.color} min-h-96`}>
              {/* Column Header */}
              <div className={`p-4 rounded-t-lg ${config.headerColor} border-b`}>
                <h3 className="font-semibold text-lg">{config.title}</h3>
                <p className="text-sm opacity-75">{statusUsers.length} usuarios</p>
              </div>
              
              {/* User Cards */}
              <div className="p-4 space-y-3">
                {statusUsers.map((user) => {
                  const isExpired = user.expires_at && new Date(user.expires_at) < new Date()
                  
                  return (
                    <Card key={`${user.type}-${user.id}`} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* User Info with Badges */}
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 max-w-full overflow-hidden">
                                <h4 className="font-medium text-sm truncate">
                                  {user.full_name || user.email}
                                </h4>
                                {user.full_name && (
                                  <p className="text-xs text-gray-600 mt-1 truncate">{user.email}</p>
                                )}
                              </div>
                            </div>
                            
                            {/* Status and Type Badges */}
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={config.badgeVariant} className="text-xs">
                                {isExpired ? 'Expirado' : config.title}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                {user.user_type}
                              </Badge>
                              {user.is_admin && (
                                <Badge variant="outline" className="text-xs">
                                  Admin
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Date Info */}
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {user.type === 'invitation' ? (
                              <span>Invited {formatDate(user.created_at)}</span>
                            ) : (
                              <span>Se unió {formatDate(user.created_at)}</span>
                            )}
                          </div>
                          
                          {/* Invited By */}
                          {user.invited_by && (
                            <div className="text-xs text-gray-500">
                              by {user.invited_by.full_name || user.invited_by.email}
                            </div>
                          )}
                          
                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <Link
                              href={`/users/${user.type === 'user' ? user.user_id : user.id}`}
                              passHref
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                Ver
                              </Button>
                            </Link>
                            
                            {user.type === 'invitation' && user.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendInvitation(user.id, user.email)}
                                className="flex items-center gap-1 text-xs"
                              >
                                <Mail className="h-3 w-3" />
                                Reenviar
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                
                {statusUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No hay usuarios {config.title.toLowerCase()}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
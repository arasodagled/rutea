'use client'

import { useState } from 'react'

import { AddUserModal } from '@/components/users/AddUserModal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import UserKanbanBoard from '@/components/users/UserKanbanBoard'

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUserAdded = () => {
    // Trigger a refresh of the users list
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Invitar Nuevo Usuario
        </Button>
      </div>
      
      <UserKanbanBoard key={refreshKey} />
      
      <AddUserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUserAdded={handleUserAdded}
      />
    </div>
  )
}
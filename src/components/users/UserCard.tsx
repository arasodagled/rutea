'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  user_type: string;
  status: string;
  updated_at: string;
  email?: string;
}

interface UserCardProps {
  user: UserProfile;
  onClick: () => void;
}

export function UserCard({ user, onClick }: UserCardProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const fullName = `${user.first_name} ${user.last_name}`.trim() || 'No Name';
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'NN';
  
  const formatDate = (dateString: string) => {
    if (!isClient) return 'Hace un momento';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es });
    } catch {
      return 'Unknown';
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'text-purple-600 bg-purple-100';
      case 'user':
        return 'text-blue-600 bg-blue-100';
      case 'candidate':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 bg-white dark:bg-gray-900"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {fullName}
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {user.email || 'Sin email'}
            </p>
            
            <div className="flex items-center justify-between mt-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                getUserTypeColor(user.user_type)
              }`}>
                {user.user_type || 'user'}
              </span>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Actualizado {formatDate(user.updated_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
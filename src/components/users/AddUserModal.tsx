'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  userType: string; // Add this
}

export function AddUserModal({ isOpen, onClose, onUserAdded }: AddUserModalProps) {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    userType: 'user' // Add default
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'El apellido es requerido';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Por favor ingresa un email válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      userType: 'user' // Add this missing property
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase(),
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          userType: formData.userType, // Add this
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Debes estar logueado para enviar invitaciones.');
        } else if (response.status === 403) {
          toast.error('No tienes permisos para enviar invitaciones.');
        } else {
          toast.error(result.error || 'Error al enviar la invitación. Por favor intenta de nuevo.');
        }
        return;
      }

      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success(result.message || '¡Invitación enviada exitosamente!');
      }

      resetForm();
      onUserAdded();
      onClose();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Error al enviar la invitación. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
        <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
        <DialogDescription>
          Envía una invitación a un nuevo usuario. Recibirá un email con instrucciones para registrarse.
        </DialogDescription>
      </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombre</Label>
            <Input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className={errors.firstName ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.firstName && (
              <p className="text-sm text-red-500">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Apellido</Label>
            <Input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className={errors.lastName ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.lastName && (
              <p className="text-sm text-red-500">{errors.lastName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="userType">Tipo de Usuario</Label>
            <Select value={formData.userType} onValueChange={(value) => handleInputChange('userType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Invitación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
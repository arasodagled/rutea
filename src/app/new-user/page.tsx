'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { sanitizeFilename } from '@/lib/utils';
import { Upload, FileText, Linkedin, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

interface FormData {
  linkedinUrl: string;
  cvFile: File | null;
}

// Main component that wraps the content in Suspense
export default function NewUserPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <NewUserContent />
    </Suspense>
  );
}

// Component with the actual content
function NewUserContent() {
  const [formData, setFormData] = useState<FormData>({
    linkedinUrl: '',
    cvFile: null
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated and if this is their first login
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
        router.push('/login');
        return;
      }

      // Check if user profile exists and if it's first login
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_first_login, cv_file_path')
        .eq('user_id', session.user.id)
        .single();

      // If not first login and already has CV, redirect to chat-onboarding
      if (profile && !profile.is_first_login && profile.cv_file_path) {
        router.push('/chat-onboarding');
        return;
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.cvFile) {
      newErrors.cvFile = 'Por favor sube tu CV';
    } else {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(formData.cvFile.type)) {
        newErrors.cvFile = 'Por favor sube un documento PDF o Word';
      }
      
      // Check file size (max 10MB)
      if (formData.cvFile.size > 10 * 1024 * 1024) {
        newErrors.cvFile = 'El archivo debe ser menor a 10MB';
      }
    }

    // Validar que LinkedIn URL sea obligatorio
    if (!formData.linkedinUrl) {
      newErrors.linkedinUrl = 'Por favor ingresa tu URL de LinkedIn';
    } else if (!isValidLinkedInUrl(formData.linkedinUrl)) {
      newErrors.linkedinUrl = 'Por favor ingresa una URL válida de LinkedIn';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidLinkedInUrl = (url: string): boolean => {
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9-]+\/?$/;
    return linkedinRegex.test(url);
  };

  const handleFileChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, cvFile: file }));
    if (errors.cvFile) {
      setErrors(prev => ({ ...prev, cvFile: undefined }));
    }
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({ ...prev, cvFile: null }));
    // Clear any file-related errors
    if (errors.cvFile) {
      setErrors(prev => ({ ...prev, cvFile: undefined }));
    }
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('No authenticated user');
  
    const fileExt = file.name.split('.').pop();
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    const sanitizedName = sanitizeFilename(originalName);
    const fileName = `${sanitizedName}-${Date.now()}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;
  
    // Debug logging
    console.log('Original filename:', file.name);
    console.log('Original name without extension:', originalName);
    console.log('Sanitized name:', sanitizedName);
    console.log('Final filename:', fileName);
    console.log('Full file path:', filePath);
  
    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(filePath, file);
  
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }
  
    const { data: { publicUrl } } = supabase.storage
      .from('user-files')
      .getPublicUrl(filePath);
  
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Debes estar logueado para continuar.');
        return;
      }

      let cvFilePath = '';
      let cvFileName = '';

      // Upload CV file
      if (formData.cvFile) {
        cvFilePath = await uploadFile(formData.cvFile);
        cvFileName = formData.cvFile.name;
      }

      // Update user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          linkedin_url: formData.linkedinUrl,  // Ya no usamos || null porque es obligatorio
          cv_file_path: cvFilePath,
          cv_file_name: cvFileName,
          is_first_login: false,
          status: 'active'
        })
        .eq('user_id', session.user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        toast.error('Error al guardar tu información. Por favor intenta de nuevo.');
        return;
      }

      toast.success('¡Perfil actualizado exitosamente!');
      
      // Añadir un pequeño retraso antes de la redirección para asegurar que la actualización se complete
      setTimeout(() => {
        router.push('/chat-onboarding');
      }, 500);
    } catch (error) {
      console.error('Error saving user data:', error);
      toast.error('Error al guardar tu información. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">¡Bienvenido a Rutea!</CardTitle>
          <CardDescription>
            Configuremos tu perfil para comenzar tu viaje de autoconocimiento.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* CV Upload */}
            <div className="space-y-2">
              <Label htmlFor="cv-upload">Sube tu CV *</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : errors.cvFile
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  id="cv-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                  disabled={loading}
                />
                
                {formData.cvFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formData.cvFile.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {(formData.cvFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      disabled={loading}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Eliminar archivo"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400 mb-1">
                      Arrastra y suelta tu CV aquí, o{' '}
                      <label
                        htmlFor="cv-upload"
                        className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium"
                      >
                        examinar
                      </label>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Solo documentos PDF o Word (máx 10MB)
                    </p>
                  </div>
                )}
              </div>
              {errors.cvFile && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.cvFile}
                </p>
              )}
            </div>

            {/* LinkedIn URL */}
            <div className="space-y-2">
              <Label htmlFor="linkedin">URL de perfil de LinkedIn *</Label>
              <div className="relative">
                <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/tu-perfil"
                  value={formData.linkedinUrl}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }));
                    if (errors.linkedinUrl) {
                      setErrors(prev => ({ ...prev, linkedinUrl: undefined }));
                    }
                  }}
                  className={`pl-10 ${errors.linkedinUrl ? 'border-red-500' : ''}`}
                  disabled={loading}
                  required
                />
              </div>
              {errors.linkedinUrl && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.linkedinUrl}
                </p>
              )}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tu CV y perfil de LinkedIn nos ayudarán a brindarte mejor orientación profesional adaptada a tu experiencia.
              </AlertDescription>
            </Alert>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
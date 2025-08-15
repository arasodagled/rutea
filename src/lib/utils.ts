import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeFilename(filename: string): string {
  // Replace special characters with their ASCII equivalents or remove them
  const sanitized = filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s\-_\.]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  // Ensure the filename is not empty after sanitization
  if (sanitized.length === 0) {
    return `file-${Date.now()}`;
  }

  return sanitized;
}

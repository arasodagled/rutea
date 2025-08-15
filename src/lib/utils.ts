import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeFilename(filename: string): string {
  // Replace special characters with their ASCII equivalents or remove them
  let sanitized = filename
    .normalize('NFD') // Normalize to NFD (Normalization Form Canonical Decomposition)
    .replace(/\p{Diacritic}/gu, '') // Remove diacritics (accents)
    .replace(/[^a-zA-Z0-9.\-_ ]/g, '') // Remove characters that are not alphanumeric, dot, hyphen, underscore, or space
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with a single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  // Ensure the filename is not empty after sanitization
  if (sanitized.length === 0) {
    return `file-${Date.now()}`;
  }

  return sanitized;
}

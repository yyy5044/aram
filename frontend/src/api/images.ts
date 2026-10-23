import { apiFetch } from './client'

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_IMAGES_PER_POST = 10

export function uploadImage(file: File): Promise<{ id: string; url: string }> {
  const body = new FormData()
  body.append('file', file)
  return apiFetch('/api/images', { method: 'POST', body })
}

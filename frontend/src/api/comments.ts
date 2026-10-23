import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Comment } from './types'

export const commentsKey = (postId: number) => ['posts', 'comments', postId] as const

export function useComments(postId: number) {
  return useQuery({
    queryKey: commentsKey(postId),
    queryFn: () => apiFetch<Comment[]>(`/api/posts/${postId}/comments`),
  })
}

export function addComment(postId: number, content: string) {
  return apiFetch<Comment>(`/api/posts/${postId}/comments`, { method: 'POST', json: { content } })
}

export function editComment(commentId: number, content: string) {
  return apiFetch<Comment>(`/api/comments/${commentId}`, { method: 'PUT', json: { content } })
}

export function deleteComment(commentId: number) {
  return apiFetch<void>(`/api/comments/${commentId}`, { method: 'DELETE' })
}

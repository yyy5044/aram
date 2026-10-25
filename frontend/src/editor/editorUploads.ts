import { createContext, useContext } from 'react'
import type { UploadJobs } from './uploadJobs'

/** 편집기 안의 칸(NodeView)들이 함께 쓰는 것: 영상 올리기 작업 저장소와 알림. */
export type EditorUploads = {
  jobs: UploadJobs
  onError: (message: string) => void
}

export const EditorUploadsContext = createContext<EditorUploads | null>(null)

export function useEditorUploads(): EditorUploads | null {
  return useContext(EditorUploadsContext)
}

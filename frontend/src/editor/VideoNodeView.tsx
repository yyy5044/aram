import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useEffect, useSyncExternalStore } from 'react'
import BoxRemoveButton from './BoxRemoveButton'
import { useEditorUploads } from './editorUploads'
import UploadBox from './UploadBox'
import { videoFileProblem } from './uploadChecks'
import type { BoxState } from './uploadJobs'
import VideoPlayer from './VideoPlayer'

const EMPTY: BoxState = { phase: 'empty' }
const noSubscribe = () => () => {}

/**
 * 영상 노드. 글 보기에서는 클립만, 편집기에서는 비어 있으면 업로드 칸, 변환이 끝나면 클립과 빼기 버튼을 보여줘요.
 * 올리기 상태는 칸 밖의 작업 저장소(uploadJobs)에 있어서, 칸이 다시 그려져도 이어져요.
 */
export default function VideoNodeView({ node, editor, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const uploads = useEditorUploads()
  const src = node.attrs.src as string | null
  const uploadId = node.attrs.uploadId as string | null
  const truncated = Boolean(node.attrs.truncated)
  const job = useSyncExternalStore(uploads?.jobs.subscribe ?? noSubscribe, () => uploads?.jobs.get(uploadId))

  useEffect(() => {
    if (!src && job?.result) updateAttributes({ src: job.result.src, truncated: job.result.truncated })
  }, [src, job, updateAttributes])

  if (!editor.isEditable || !uploads) {
    return <NodeViewWrapper className="my-4">{src && <VideoPlayer src={src} />}</NodeViewWrapper>
  }

  function onFile(file: File) {
    if (!uploads) return
    const problem = videoFileProblem(editor, file, Boolean(uploadId))
    if (problem) {
      uploads.onError(problem)
      return
    }
    updateAttributes({ uploadId: uploads.jobs.startVideo(file) })
  }

  return (
    <NodeViewWrapper className="group relative my-4">
      {src ? <VideoPlayer src={src} /> : <UploadBox kind="video" state={job?.state ?? EMPTY} onFile={onFile} />}
      {src && truncated && <p className="mt-1 text-[13px] text-ink-3">앞 30초만 넣었어요</p>}
      <BoxRemoveButton label="영상 빼기" onRemove={deleteNode} />
    </NodeViewWrapper>
  )
}

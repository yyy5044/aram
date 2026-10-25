import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useEffect, useSyncExternalStore } from 'react'
import BoxRemoveButton from './BoxRemoveButton'
import { useEditorUploads } from './editorUploads'
import { ALLOW_CLIP_REMOVAL } from './clipGuard'
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
export default function VideoNodeView({ node, editor, getPos, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const uploads = useEditorUploads()
  const src = node.attrs.src as string | null
  const uploadId = node.attrs.uploadId as string | null
  const truncated = Boolean(node.attrs.truncated)
  const job = useSyncExternalStore(uploads?.jobs.subscribe ?? noSubscribe, () => uploads?.jobs.get(uploadId))

  // 변환이 끝나면 칸에 클립을 채워요. 되돌리기(Ctrl+Z)로 클립이 빈 칸으로 돌아가지 않게 기록에는 남기지 않아요.
  useEffect(() => {
    if (src || !job?.result) return
    const pos = getPos()
    if (typeof pos !== 'number') return
    const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      src: job.result.src,
      truncated: job.result.truncated,
    })
    editor.view.dispatch(tr.setMeta('addToHistory', false))
  }, [src, job, editor, getPos, node.attrs])

  if (!editor.isEditable || !uploads) {
    return <NodeViewWrapper className="my-4">{src && <VideoPlayer src={src} />}</NodeViewWrapper>
  }

  // 변환이 끝난 클립은 이 버튼으로만 뺄 수 있어요(키보드로는 막혀 있어요).
  function removeClip() {
    const pos = getPos()
    if (typeof pos !== 'number') {
      deleteNode()
      return
    }
    editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize).setMeta(ALLOW_CLIP_REMOVAL, true))
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
      <BoxRemoveButton label="영상 빼기" onRemove={removeClip} />
    </NodeViewWrapper>
  )
}

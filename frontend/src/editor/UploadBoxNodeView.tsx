import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useState } from 'react'
import { ApiError } from '../api/client'
import { uploadImage } from '../api/images'
import BoxRemoveButton from './BoxRemoveButton'
import { useEditorUploads } from './editorUploads'
import UploadBox from './UploadBox'
import { imageFileProblem } from './uploadChecks'
import type { BoxState } from './uploadJobs'

/** 사진 칸(/i). 사진이 올라가면 그 자리를 보통 사진(image 노드)으로 바꿔요. */
export default function UploadBoxNodeView({ node, editor, getPos, deleteNode }: ReactNodeViewProps) {
  const uploads = useEditorUploads()
  const [state, setState] = useState<BoxState>({ phase: 'empty' })

  function onFile(file: File) {
    const problem = imageFileProblem(editor, file)
    if (problem) {
      uploads?.onError(problem)
      return
    }
    setState({ phase: 'uploading', percent: -1 })
    uploadImage(file).then(
      ({ url }) => {
        const pos = getPos()
        if (typeof pos !== 'number') return
        editor
          .chain()
          .insertContentAt({ from: pos, to: pos + node.nodeSize }, { type: 'image', attrs: { src: url } })
          .run()
      },
      (e) => setState({ phase: 'failed', message: e instanceof ApiError ? e.message : '이미지를 올리지 못했어요' }),
    )
  }

  return (
    <NodeViewWrapper className="group relative my-4">
      <UploadBox kind="image" state={state} onFile={onFile} />
      <BoxRemoveButton label="사진 칸 빼기" onRemove={deleteNode} />
    </NodeViewWrapper>
  )
}

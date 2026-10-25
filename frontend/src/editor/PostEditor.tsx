import type { Editor, JSONContent } from '@tiptap/core'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES_PER_POST, uploadImage } from '../api/images'
import { EditorUploadsContext } from './editorUploads'
import { editorExtensions } from './extensions'
import { videoFileProblem } from './uploadChecks'
import { createUploadJobs } from './uploadJobs'

type Props = {
  initialContent: JSONContent | null
  onChange: (json: JSONContent) => void
  onError: (message: string) => void
  /** 올리는 중·변환 중인 영상 칸 수(busy)와 실패한 칸 수(failed). 등록 버튼 잠금에 써요. */
  onPendingChange?: (pending: { busy: number; failed: number }) => void
  labelledBy?: string
}

function isVideoFile(file: File) {
  return file.type.startsWith('video/')
}

function uploadIdsInDoc(editor: Editor) {
  const ids = new Set<string>()
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'video' && node.attrs.uploadId) ids.add(node.attrs.uploadId as string)
  })
  return ids
}

function countImages(editor: Editor) {
  let count = 0
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'image') count++
  })
  return count
}

/**
 * 본문 편집기. 이미지는 붙여넣기, 끌어다 놓기, 이미지 버튼으로 넣어요.
 * 영상은 영상 버튼이나 / 메뉴로 칸을 만들어 넣고, 편집기에 바로 끌어다 놓아도 그 자리에 칸이 생겨요.
 */
export default function PostEditor({ initialContent, onChange, onError, onPendingChange, labelledBy }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const [jobs] = useState(createUploadJobs)
  // 칸들은 편집기가 처음 만들어질 때의 처리기를 쥐고 있어서, 늘 최신 콜백을 부르도록 ref로 넘겨요.
  const onErrorRef = useRef(onError)
  const pendingRef = useRef(onPendingChange)
  useEffect(() => {
    onErrorRef.current = onError
    pendingRef.current = onPendingChange
  })

  async function insertImages(files: File[]) {
    const editor = editorRef.current
    if (!editor) return
    for (const file of files) {
      if (!IMAGE_TYPES.includes(file.type)) {
        onError('jpg, png, webp, gif 이미지만 올릴 수 있어요')
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        onError('이미지는 10MB 이하만 올릴 수 있어요')
        continue
      }
      if (countImages(editor) >= MAX_IMAGES_PER_POST) {
        onError('이미지는 한 글에 10장까지 넣을 수 있어요')
        return
      }
      try {
        const { url } = await uploadImage(file)
        editor.chain().focus().setImage({ src: url }).run()
      } catch (e) {
        onError(e instanceof ApiError ? e.message : '이미지를 올리지 못했어요')
      }
    }
  }

  /** 편집기 아무 곳에나 놓은 영상은 그 자리에 영상 칸을 만들어 올려요. */
  function insertVideoFile(file: File, pos?: number) {
    const editor = editorRef.current
    if (!editor) return
    const problem = videoFileProblem(editor, file)
    if (problem) {
      onError(problem)
      return
    }
    const uploadId = jobs.startVideo(file)
    const node = { type: 'video', attrs: { uploadId } }
    const chain = editor.chain().focus()
    if (pos === undefined) chain.insertContent(node).run()
    else chain.insertContentAt(pos, node).run()
  }

  const editor = useEditor({
    extensions: editorExtensions(),
    content: initialContent ?? undefined,
    immediatelyRender: true,
    editorProps: {
      attributes: {
        class: 'min-h-48 px-3 py-2.5 outline-none',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
      },
      handlePaste: (_view, event) => {
        const pasted = Array.from(event.clipboardData?.files ?? [])
        const video = pasted.find(isVideoFile)
        if (video) {
          insertVideoFile(video)
          return true
        }
        const files = pasted.filter((f) => f.type.startsWith('image/'))
        if (files.length === 0) return false
        void insertImages(files)
        return true
      },
      handleDrop: (view, event) => {
        const dropped = Array.from((event as DragEvent).dataTransfer?.files ?? [])
        const video = dropped.find(isVideoFile)
        if (video) {
          event.preventDefault()
          const at = view.posAtCoords({ left: (event as DragEvent).clientX, top: (event as DragEvent).clientY })
          insertVideoFile(video, at?.pos)
          return true
        }
        const files = dropped.filter((f) => f.type.startsWith('image/'))
        if (files.length === 0) return false
        event.preventDefault()
        void insertImages(files)
        return true
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  })

  // 붙여넣기·끌어놓기 처리기는 편집기가 처음 만들어질 때 고정돼요. 개발 모드에서는 편집기가 다시 만들어지므로
  // 항상 지금 살아 있는 편집기를 가리키도록 ref를 맞춰요.
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // 본문에서 사라진 영상 칸의 올리기·상태 조회는 멈추고, 등록 잠금에 쓸 요약을 부모에 알려요.
  useEffect(() => {
    if (!editor) return
    let last = ''
    const report = () => {
      const summary = jobs.summary()
      const key = `${summary.busy}/${summary.failed}`
      if (key !== last) {
        last = key
        pendingRef.current?.(summary)
      }
    }
    const onUpdate = () => {
      jobs.retainOnly(uploadIdsInDoc(editor))
      report()
    }
    const unsubscribe = jobs.subscribe(report)
    editor.on('update', onUpdate)
    return () => {
      unsubscribe()
      editor.off('update', onUpdate)
    }
  }, [editor, jobs])

  // 키보드로 클립을 지우려다 막히면 ✕ 버튼을 알려줘요. 꾹 누르고 있어도 3초에 한 번만.
  useEffect(() => {
    if (!editor) return
    let last = 0
    const onBlocked = () => {
      const now = Date.now()
      if (now - last < 3000) return
      last = now
      onErrorRef.current('영상은 오른쪽 위 ✕ 버튼으로 뺄 수 있어요')
    }
    editor.on('clipRemovalBlocked', onBlocked)
    return () => {
      editor.off('clipRemovalBlocked', onBlocked)
    }
  }, [editor])

  // 편집기를 떠나면 남은 올리기와 상태 조회를 모두 멈춰요.
  useEffect(() => () => jobs.retainOnly(new Set()), [jobs])

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive('bold') ?? false,
      italic: e?.isActive('italic') ?? false,
      bullet: e?.isActive('bulletList') ?? false,
      ordered: e?.isActive('orderedList') ?? false,
      quote: e?.isActive('blockquote') ?? false,
    }),
  })

  const [uploads] = useState(() => ({ jobs, onError: (message: string) => onErrorRef.current(message) }))

  // 서식 버튼 36px: 자주 쓰지만 주인공은 아니라 편집기 위 얇은 띠에 모아요. 켜진 서식은 남색.
  const tool = (on: boolean | undefined) =>
    `h-9 min-w-9 rounded-[6px] px-2.5 text-sm ${on ? 'bg-night text-gold-pale' : 'text-ink-2 hover:bg-ice hover:text-ink'}`
  const divider = <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />

  return (
    <div className="overflow-hidden rounded-touch border border-line bg-white focus-within:border-teal focus-within:ring-3 focus-within:ring-teal-hi/20">
      <div className="flex flex-wrap items-center gap-1 border-b border-line-soft bg-[#f6fafc] p-1">
        <button type="button" className={tool(active?.bold)} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <b>굵게</b>
        </button>
        <button type="button" className={tool(active?.italic)} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <i>기울임</i>
        </button>
        {divider}
        <button type="button" className={tool(active?.bullet)} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          • 목록
        </button>
        <button type="button" className={tool(active?.ordered)} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          1. 목록
        </button>
        <button type="button" className={tool(active?.quote)} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
          ❝ 인용
        </button>
        {divider}
        <button type="button" className={tool(false)} onClick={() => fileInput.current?.click()}>
          🖼 이미지
        </button>
        <button type="button" className={tool(false)} onClick={() => editor?.chain().focus().insertContent({ type: 'video' }).run()}>
          <span aria-hidden="true">▶</span> 영상
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          multiple
          aria-label="이미지 넣기"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            void insertImages(files)
          }}
        />
      </div>
      <div className="post-content editor-area px-4 py-3 text-[17px] leading-[1.75] text-ink">
        <EditorUploadsContext.Provider value={uploads}>
          <EditorContent editor={editor} />
        </EditorUploadsContext.Provider>
      </div>
    </div>
  )
}

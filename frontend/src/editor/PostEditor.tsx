import type { Editor, JSONContent } from '@tiptap/core'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { useEffect, useRef } from 'react'
import { ApiError } from '../api/client'
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES_PER_POST, uploadImage } from '../api/images'
import { postExtensions } from './extensions'

type Props = {
  initialContent: JSONContent | null
  onChange: (json: JSONContent) => void
  onError: (message: string) => void
  labelledBy?: string
}

function countImages(editor: Editor) {
  let count = 0
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'image') count++
  })
  return count
}

/** 본문 편집기. 이미지는 붙여넣기, 끌어다 놓기, 이미지 버튼으로 넣어요. */
export default function PostEditor({ initialContent, onChange, onError, labelledBy }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const editorRef = useRef<Editor | null>(null)

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

  const editor = useEditor({
    extensions: postExtensions(),
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
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
        if (files.length === 0) return false
        void insertImages(files)
        return true
      },
      handleDrop: (_view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'))
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

  const tool = (on: boolean | undefined) =>
    `rounded-md px-2 py-1 text-sm ${on ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-100'}`

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900">
      <div className="flex flex-wrap gap-1 border-b border-slate-800 p-1.5">
        <button type="button" className={tool(active?.bold)} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <b>굵게</b>
        </button>
        <button type="button" className={tool(active?.italic)} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <i>기울임</i>
        </button>
        <button type="button" className={tool(active?.bullet)} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          • 목록
        </button>
        <button type="button" className={tool(active?.ordered)} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          1. 목록
        </button>
        <button type="button" className={tool(active?.quote)} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
          ❝ 인용
        </button>
        <button type="button" className={tool(false)} onClick={() => fileInput.current?.click()}>
          🖼 이미지
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
      <div className="post-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

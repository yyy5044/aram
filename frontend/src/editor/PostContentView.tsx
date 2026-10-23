import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { postExtensions } from './extensions'

/** 읽기 전용 본문. 편집기와 같은 규칙으로 그려서 사용자 입력이 HTML로 끼어들 수 없어요. */
export default function PostContentView({ content }: { content: JSONContent }) {
  const editor = useEditor(
    {
      extensions: postExtensions(),
      content,
      editable: false,
      immediatelyRender: true,
    },
    [content],
  )
  return <EditorContent editor={editor} className="post-content" />
}

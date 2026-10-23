import type { Extensions } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import StarterKit from '@tiptap/starter-kit'

/**
 * 본문에 허용하는 서식: 문단, 줄바꿈, 글머리·번호 목록, 인용, 이미지, 굵게, 기울임.
 * 서버(PostContentValidator)와 같은 규칙이에요. 여기에 없는 서식은 저장도 표시도 안 돼요.
 */
export function postExtensions(): Extensions {
  return [
    StarterKit.configure({
      code: false,
      codeBlock: false,
      heading: false,
      horizontalRule: false,
      link: false,
      strike: false,
      underline: false,
    }),
    Image.configure({ inline: false, allowBase64: false }),
  ]
}

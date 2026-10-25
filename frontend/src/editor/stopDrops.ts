const DROP_EVENTS = new Set(['drop', 'dragover', 'dragenter', 'dragleave'])

/**
 * 업로드 칸(data-drop-zone)에 떨어진 파일은 칸이 직접 받아요. 편집기(ProseMirror)가 같은 파일을 한 번 더
 * 처리하지 않게, 칸 안의 끌어다 놓기 이벤트는 편집기에 넘기지 않아요.
 */
export function stopDropsOnUploadBox({ event }: { event: Event }): boolean {
  const target = event.target
  if (!(target instanceof Element)) return false
  if (DROP_EVENTS.has(event.type)) return target.closest('[data-drop-zone]') !== null
  // 칸 안의 버튼(빼기, 다른 파일 올리기)과 파일 고르기는 편집기가 가로채지 않게 해요(Tiptap 기본 동작과 같음).
  return !event.type.startsWith('drag') && target.closest('button, input') !== null
}

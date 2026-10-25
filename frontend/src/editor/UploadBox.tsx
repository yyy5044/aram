import { useRef, useState } from 'react'
import { buttonClass } from '../components/ui/button'
import type { BoxState } from './uploadJobs'

type Props = {
  kind: 'video' | 'image'
  state: BoxState
  onFile: (file: File) => void
}

const TEXT = {
  video: { title: '파일을 업로드해주세요', hint: '끌어다 놓거나 눌러서 고르기 · 30초 · 200MB까지', pick: '영상 파일 고르기', accept: 'video/*', icon: '▶' },
  image: { title: '사진을 업로드해주세요', hint: '끌어다 놓거나 눌러서 고르기', pick: '사진 파일 고르기', accept: 'image/*', icon: '▣' },
}

/** 본문 속 점선 칸. 파일을 끌어다 놓거나 눌러서 고르고, 올리는 중·변환 중 진행률을 보여줘요. */
export default function UploadBox({ kind, state, onFile }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const text = TEXT[kind]
  const empty = state.phase === 'empty'

  function take(files: FileList | null | undefined) {
    const file = files?.[0]
    if (file) onFile(file)
  }

  const percent = state.phase === 'uploading' || state.phase === 'processing' ? state.percent : null

  return (
    <div
      data-drop-zone=""
      data-dragging={dragging || undefined}
      className={`flex h-40 flex-col items-center justify-center gap-2 border-2 border-dashed px-4 text-center ${
        dragging ? 'border-teal bg-ice' : 'border-line bg-[#f6fafc]'
      } ${empty ? 'cursor-pointer' : ''}`}
      onClick={() => empty && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (empty || state.phase === 'failed') take(e.dataTransfer?.files)
      }}
    >
      <input
        ref={input}
        type="file"
        accept={text.accept}
        aria-label={text.pick}
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          take(files)
          e.target.value = ''
        }}
      />
      {state.phase === 'empty' && (
        <>
          <span aria-hidden="true" className="text-[20px] text-ink-3">
            {text.icon}
          </span>
          <span className="text-[15px] text-ink-2">{text.title}</span>
          <span className="text-[13px] text-ink-3">{text.hint}</span>
        </>
      )}
      {state.phase === 'queued' && <span className="text-[15px] text-ink-2">변환 차례를 기다리고 있어요</span>}
      {percent !== null && (
        <div className="flex w-full max-w-80 flex-col items-center gap-2">
          <span className="text-[15px] text-ink-2">
            {state.phase === 'uploading' ? (percent < 0 ? '올리는 중' : `올리는 중 ${percent}%`) : `변환 중 ${percent}%`}
          </span>
          {percent >= 0 && (
          <div className="h-2 w-full bg-line-soft" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 bg-teal transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          )}
        </div>
      )}
      {state.phase === 'failed' && (
        <>
          <span className="text-[15px] text-danger">{state.message}</span>
          <button
            type="button"
            className={buttonClass('ghost', 36)}
            onClick={(e) => {
              e.stopPropagation()
              input.current?.click()
            }}
          >
            다른 파일 올리기
          </button>
        </>
      )}
    </div>
  )
}

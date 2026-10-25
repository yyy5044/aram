import { useEffect, useRef, useState } from 'react'

/**
 * 글 속 영상 클립. GIF처럼 소리 없이 반복하고, 화면에 보일 때만 재생해요.
 * 누르면 멈추고, 직접 멈춘 영상은 다시 누를 때까지 자동으로 재생하지 않아요.
 */
export default function VideoPlayer({ src }: { src: string }) {
  const video = useRef<HTMLVideoElement>(null)
  const userPaused = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [portrait, setPortrait] = useState(false)

  function play() {
    const el = video.current
    if (!el) return
    el.muted = true
    el.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    )
  }

  function pause() {
    video.current?.pause()
    setPlaying(false)
  }

  useEffect(() => {
    const el = video.current
    if (!el) return
    el.muted = true
    if (typeof IntersectionObserver === 'undefined') {
      play()
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!userPaused.current) play()
        } else {
          pause()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [src])

  function toggle() {
    if (playing) {
      userPaused.current = true
      pause()
    } else {
      userPaused.current = false
      play()
    }
  }

  return (
    <div className={`relative ${portrait ? 'mx-auto max-w-[360px]' : ''}`}>
      <video
        ref={video}
        src={src}
        poster={`${src}/poster`}
        muted
        loop
        playsInline
        preload="metadata"
        className="block w-full"
        onLoadedMetadata={(e) => setPortrait(e.currentTarget.videoHeight > e.currentTarget.videoWidth)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? '영상 멈추기' : '영상 재생'}
        className="absolute inset-0 flex items-center justify-center"
      >
        {!playing && (
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-night/60 text-[20px] text-white">
            ▶
          </span>
        )}
      </button>
    </div>
  )
}

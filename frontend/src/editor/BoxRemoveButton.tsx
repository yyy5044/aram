import { buttonClass } from '../components/ui/button'

/** 편집기 속 영상·사진 칸의 오른쪽 위 빼기 버튼. 마우스를 올리면 보이고, 터치 화면에서는 늘 보여요. */
export default function BoxRemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-lg:opacity-100">
      <button type="button" aria-label={label} className={buttonClass('ghost', 36)} onClick={onRemove}>
        ✕
      </button>
    </span>
  )
}

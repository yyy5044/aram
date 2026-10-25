import { buttonClass } from './ui/button'
import EmptyState from './ui/EmptyState'

/** 주소의 페이지 번호가 마지막 페이지를 넘었을 때(?page=9) 보여줘요. */
export default function PastLastPage({ onFirstPage }: { onFirstPage: () => void }) {
  return (
    <EmptyState
      title="이 페이지는 비어 있어요"
      action={
        <button type="button" onClick={onFirstPage} className={buttonClass('primary', 44)}>
          첫 페이지로
        </button>
      }
    />
  )
}

/** 주소의 페이지 번호가 마지막 페이지를 넘었을 때(?page=9) 보여줘요. */
export default function PastLastPage({ onFirstPage }: { onFirstPage: () => void }) {
  return (
    <div className="py-12 text-center text-slate-400">
      <p className="mb-3">이 페이지는 비어 있어요</p>
      <button
        type="button"
        onClick={onFirstPage}
        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-amber-300"
      >
        첫 페이지로
      </button>
    </div>
  )
}

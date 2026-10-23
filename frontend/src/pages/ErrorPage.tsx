/** 화면을 그리다 예상하지 못한 오류가 났을 때 보여줘요. */
export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-24 text-center text-slate-100">
      <p className="mb-4 text-lg">문제가 생겼어요. 새로고침해 주세요.</p>
      <a href="/" className="text-amber-300 hover:underline">
        메인으로 가기
      </a>
    </div>
  )
}

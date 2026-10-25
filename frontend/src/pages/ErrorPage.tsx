/** 화면을 그리다 예상하지 못한 오류가 났을 때 보여줘요. */
export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-ice px-4 py-24 text-center text-ink">
      <p className="mb-4 text-lg">문제가 생겼어요. 새로고침해 주세요.</p>
      <a href="/" className="font-bold text-teal-ink hover:underline">
        메인으로 가기
      </a>
    </div>
  )
}

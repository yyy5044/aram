import { Link } from 'react-router'

export default function NotFoundPage({ message = '페이지를 찾을 수 없어요' }: { message?: string }) {
  return (
    <section className="py-16 text-center">
      <p className="mb-4 text-lg text-slate-300">{message}</p>
      <Link to="/" className="text-amber-300 hover:underline">
        메인으로 가기
      </Link>
    </section>
  )
}

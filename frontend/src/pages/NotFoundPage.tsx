import { Link } from 'react-router'
import { buttonClass } from '../components/ui/button'
import EmptyState from '../components/ui/EmptyState'

export default function NotFoundPage({ message = '페이지를 찾을 수 없어요' }: { message?: string }) {
  return (
    <EmptyState
      title={message}
      action={
        <Link to="/" className={buttonClass('primary', 44)}>
          메인으로 가기
        </Link>
      }
    />
  )
}

import { ApiError } from '../../api/client'

/** 목록 화면의 불러오는 중·오류 문구. 둘 다 아니면 아무것도 안 그려요. */
export default function TagPageStatus({ pending, error }: { pending: boolean; error: unknown }) {
  if (error) {
    return (
      <p className="py-16 text-center text-danger">
        {error instanceof ApiError ? error.message : '잠시 후 다시 시도해주세요'}
      </p>
    )
  }
  if (pending) return <p className="py-16 text-center text-ink-3">불러오는 중이에요</p>
  return null
}

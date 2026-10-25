import { Link, matchPath, useLocation } from 'react-router'
import { PenIcon } from './ui/icons'

/** 글 목록이 보이는 화면들. 떠 있는 글쓰기 버튼은 여기서만 보여요. */
const LIST_PATHS = ['/', '/augments', '/champions', '/augments/:augmentId', '/champions/:championId', '/users/:userId']

/** 좁은 화면(1024px 미만)에서 엄지가 닿는 오른쪽 아래의 글쓰기 버튼(56px). 넓은 화면은 머리말 버튼을 써요. */
export default function WriteFab() {
  const { pathname } = useLocation()
  if (!LIST_PATHS.some((path) => matchPath(path, pathname))) return null
  return (
    <Link
      to="/write"
      aria-label="글쓰기"
      data-testid="write-fab"
      className="fixed right-4 bottom-[max(20px,env(safe-area-inset-bottom))] z-30 grid h-14 w-14 place-items-center rounded-touch bg-linear-to-b from-teal-hi to-teal text-white shadow-[0_6px_16px_#08768355] lg:hidden"
    >
      <PenIcon className="h-6 w-6" />
    </Link>
  )
}

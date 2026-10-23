import { Link } from 'react-router'
import PostList from '../components/PostList'

export default function HomePage() {
  return (
    <PostList
      empty={
        <div className="py-16 text-center text-slate-400">
          <p className="mb-4">아직 글이 없어요. 첫 글을 써보세요</p>
          <Link to="/write" className="rounded-lg bg-amber-300 px-4 py-2 font-bold text-slate-900">
            글쓰기
          </Link>
        </div>
      }
    />
  )
}

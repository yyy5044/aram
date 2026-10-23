import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import { usePostList, type PostSort } from '../api/posts'
import type { Page, PostListItem as Item } from '../api/types'
import Pagination from './Pagination'
import PostListItem from './PostListItem'
import SortPills from './SortPills'

type Props = {
  champion?: string
  augment?: string
  empty?: ReactNode
  header?: (page: Page<Item> | undefined) => ReactNode
}

/** 정렬 버튼, 글 목록, 페이지 번호. 정렬과 페이지는 주소(?sort=&page=)에 남아요. */
export default function PostList({ champion, augment, empty, header }: Props) {
  const [params, setParams] = useSearchParams()
  const sort: PostSort = params.get('sort') === 'likes' ? 'likes' : 'latest'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, error, isPending } = usePostList({ sort, page, champion, augment })

  function update(next: { sort?: PostSort; page?: number }) {
    const p = new URLSearchParams(params)
    if (next.sort) {
      p.set('sort', next.sort)
      p.delete('page')
    }
    if (next.page) p.set('page', String(next.page))
    setParams(p)
    window.scrollTo?.({ top: 0 })
  }

  return (
    <section>
      {header?.(data)}
      <SortPills value={sort} onChange={(s) => update({ sort: s })} />
      {error && (
        <p className="py-10 text-center text-rose-400">
          {error instanceof ApiError ? error.message : '잠시 후 다시 시도해주세요'}
        </p>
      )}
      {!error && !isPending && data && data.items.length === 0 && empty}
      {data && data.items.length > 0 && (
        <ul>
          {data.items.map((post) => (
            <PostListItem key={post.id} post={post} />
          ))}
        </ul>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => update({ page: p })} />}
    </section>
  )
}

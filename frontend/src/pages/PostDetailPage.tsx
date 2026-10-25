import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useMe } from '../api/me'
import { deletePost, usePost } from '../api/posts'
import Avatar from '../components/Avatar'
import CommentSection from '../components/CommentSection'
import LikeButton from '../components/LikeButton'
import ScrapButton from '../components/ScrapButton'
import { useToast } from '../components/toastContext'
import { buttonClass } from '../components/ui/button'
import CornerFrame from '../components/ui/CornerFrame'
import { PAGE_NARROW } from '../components/ui/layout'
import TagChip from '../components/ui/TagChip'
import VersionChip from '../components/ui/VersionChip'
import PostContentView from '../editor/PostContentView'
import { relativeTime } from '../lib/relativeTime'
import { parseRouteId } from '../lib/routeId'
import NotFoundPage from './NotFoundPage'

export default function PostDetailPage() {
  const postId = parseRouteId(useParams().postId) ?? Number.NaN
  const { data: post, error, isPending } = usePost(postId)
  const { data: me } = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  if (Number.isNaN(postId) || (error instanceof ApiError && error.status === 404)) return <NotFoundPage message="없는 글이에요" />
  if (error) {
    return <p className="py-10 text-center text-danger">{error instanceof ApiError ? error.message : '잠시 후 다시 시도해주세요'}</p>
  }
  if (isPending || !post) return null

  const isAuthor = me?.id === post.author.id
  const canDelete = isAuthor || !!me?.admin

  async function handleDelete() {
    if (!window.confirm('글을 삭제할까요?')) return
    try {
      await deletePost(postId)
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : '잠시 후 다시 시도해주세요')
      return
    }
    queryClient.removeQueries({ queryKey: ['posts', 'detail', postId] })
    void queryClient.invalidateQueries({ queryKey: ['posts', 'list'] })
    toast.show('글을 삭제했어요')
    navigate('/', { replace: true })
  }

  return (
    <div className={PAGE_NARROW}>
      <Link to="/" className="mb-4 inline-block text-[13px] text-ink-3 hover:text-ink">
        ‹ 목록으로
      </Link>
      <CornerFrame as="article" size={16} className="border border-line-soft bg-surface p-5 sm:p-8">
        <h1 className="mb-3 font-display text-xl leading-snug text-balance break-words text-night sm:text-[28px]">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line-soft pb-6 text-[13px] text-ink-3">
          <Link to={`/users/${post.author.id}`} className="flex items-center gap-2 text-[15px] font-bold text-ink hover:text-teal-ink">
            <Avatar src={post.author.avatarUrl} name={post.author.nickname} size={32} />
            {post.author.nickname}
          </Link>
          <span>{relativeTime(post.createdAt)}</span>
          {post.edited && <span>수정됨</span>}
          <VersionChip patch={post.gamePatch} />
          <span className="ml-auto flex gap-1">
            {isAuthor && (
              <Link to={`/posts/${post.id}/edit`} className={buttonClass('quiet')}>
                수정
              </Link>
            )}
            {canDelete && (
              <button type="button" onClick={handleDelete} className={buttonClass('quietDanger')}>
                삭제
              </button>
            )}
          </span>
        </div>

        <div className="max-w-[40em] py-6 text-[17px] leading-[1.75]">
          <PostContentView content={post.content} />
        </div>

        {(post.champions.length > 0 || post.augments.length > 0) && (
          <div className="flex flex-wrap gap-2 border-t border-line-soft pt-4 pb-6">
            {post.champions.map((c) => (
              <TagChip key={c.id} kind="champion" id={c.id} nameKo={c.nameKo} imageUrl={c.imageUrl} size="lg" link />
            ))}
            {post.augments.map((a) => (
              <TagChip
                key={a.id}
                kind="augment"
                id={a.id}
                nameKo={a.nameKo}
                imageUrl={a.iconUrl}
                rarity={a.rarity}
                tinted={a.iconTinted}
                size="lg"
                link
              />
            ))}
          </div>
        )}

        <div className="flex justify-center gap-3 border-t border-line-soft pt-6">
          <LikeButton key={post.id} postId={post.id} likeCount={post.likeCount} likedByMe={post.likedByMe} />
          <ScrapButton key={`scrap-${post.id}`} postId={post.id} scrappedByMe={post.scrappedByMe} />
        </div>
      </CornerFrame>

      <CommentSection postId={post.id} />
    </div>
  )
}

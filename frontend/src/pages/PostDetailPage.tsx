import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useMe } from '../api/me'
import { deletePost, usePost } from '../api/posts'
import Avatar from '../components/Avatar'
import CommentSection from '../components/CommentSection'
import LikeButton from '../components/LikeButton'
import ScrapButton from '../components/ScrapButton'
import TagChip from '../components/TagChip'
import { useToast } from '../components/toastContext'
import PostContentView from '../editor/PostContentView'
import { relativeTime } from '../lib/relativeTime'
import NotFoundPage from './NotFoundPage'

export default function PostDetailPage() {
  const postId = Number(useParams().postId)
  const { data: post, error, isPending } = usePost(postId)
  const { data: me } = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage message="없는 글이에요" />
  if (error) {
    return <p className="py-10 text-center text-rose-400">{error instanceof ApiError ? error.message : '잠시 후 다시 시도해주세요'}</p>
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
    <article>
      <Link to="/" className="mb-3 inline-block text-sm text-slate-400 hover:text-slate-200">
        ‹ 목록으로
      </Link>
      <h1 className="mb-2 text-xl font-bold break-words">{post.title}</h1>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="rounded-md border border-emerald-900 bg-emerald-950 px-1.5 font-bold text-emerald-400">
          {post.gamePatch}
        </span>
        <Link to={`/users/${post.author.id}`} className="flex items-center gap-1.5 hover:text-slate-100 hover:underline">
          <Avatar src={post.author.avatarUrl} size={20} />
          {post.author.nickname}
        </Link>
        <span>{relativeTime(post.createdAt)}</span>
        {post.edited && <span>수정됨</span>}
        <span className="ml-auto flex gap-1.5">
          {isAuthor && (
            <Link to={`/posts/${post.id}/edit`} className="rounded-md border border-slate-700 px-2 py-0.5 hover:text-slate-100">
              수정
            </Link>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-slate-700 px-2 py-0.5 hover:text-rose-300"
            >
              삭제
            </button>
          )}
        </span>
      </div>

      <div className="my-5 leading-relaxed">
        <PostContentView content={post.content} />
      </div>

      {(post.champions.length > 0 || post.augments.length > 0) && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-800 py-3">
          {post.champions.map((c) => (
            <TagChip key={c.id} kind="champion" id={c.id} nameKo={c.nameKo} imageUrl={c.imageUrl} />
          ))}
          {post.augments.map((a) => (
            <TagChip
              key={a.id}
              kind="augment"
              id={a.id}
              nameKo={a.nameKo}
              imageUrl={a.iconUrl}
              tint={a.iconTinted ? a.rarity : undefined}
            />
          ))}
        </div>
      )}

      <div className="flex justify-center gap-2.5 border-y border-slate-800 py-4">
        <LikeButton key={post.id} postId={post.id} likeCount={post.likeCount} likedByMe={post.likedByMe} />
        <ScrapButton key={`scrap-${post.id}`} postId={post.id} scrappedByMe={post.scrappedByMe} />
      </div>

      <CommentSection postId={post.id} />
    </article>
  )
}

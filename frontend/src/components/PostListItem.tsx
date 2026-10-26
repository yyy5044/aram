import { Link } from 'react-router'
import type { PostListItem as Item } from '../api/types'
import { formatCount } from '../lib/formatCount'
import { relativeTime } from '../lib/relativeTime'
import Avatar from './Avatar'
import CornerFrame from './ui/CornerFrame'
import TagChip from './ui/TagChip'
import VersionChip from './ui/VersionChip'

/**
 * 글 목록 한 줄(설계 5.1). 왼쪽 작성자(사진 + 이름), 가운데 제목 → 태그 → 패치·시간·댓글, 오른쪽 추천 수.
 * 추천받은 글에만 금색 모서리 장식이 붙어요. compact는 펼침 영역의 56px 한 줄이에요.
 */
export default function PostListItem({ post, compact = false }: { post: Item; compact?: boolean }) {
  if (compact) return <CompactRow post={post} />

  const box =
    'grid grid-cols-[48px_minmax(0,1fr)_36px] gap-x-2.5 border border-line-soft bg-surface py-3.5 pr-2 pl-1.5 hover:border-line sm:grid-cols-[64px_minmax(0,1fr)_48px] sm:gap-x-4 sm:py-5 sm:pr-4 sm:pl-3'
  const body = (
    <>
      <Link
        to={`/users/${post.author.id}`}
        className="flex min-w-0 flex-col items-center gap-1.5 text-ink-2 hover:text-teal-ink"
      >
        <Avatar
          src={post.author.avatarUrl}
          name={post.author.nickname}
          size={40}
          className="max-sm:!h-8 max-sm:!w-8 max-sm:!text-[13px]"
        />
        <span className="max-w-full truncate text-xs font-medium sm:text-[13px]">{post.author.nickname}</span>
      </Link>
      <div className="min-w-0">
        <Link
          to={`/posts/${post.id}`}
          className="block text-[17px] leading-snug font-bold break-words text-night hover:text-teal-ink sm:text-xl"
        >
          {post.title}
        </Link>
        {(post.champions.length > 0 || post.augments.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.champions.map((c) => (
              <TagChip key={c.id} kind="champion" id={c.id} nameKo={c.nameKo} imageUrl={c.imageUrl} size="sm" />
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
                size="sm"
              />
            ))}
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
          <VersionChip patch={post.gamePatch} />
          <span>{relativeTime(post.createdAt)}</span>
          <span>댓글 {post.commentCount}</span>
          <span>조회 {formatCount(post.viewCount)}</span>
        </div>
      </div>
      <Likes count={post.likeCount} />
    </>
  )
  return post.likeCount > 0 ? (
    <CornerFrame as="li" className={box}>
      {body}
    </CornerFrame>
  ) : (
    <li className={box}>{body}</li>
  )
}

function CompactRow({ post }: { post: Item }) {
  return (
    <li className="flex h-14 items-center gap-3 border-line-soft px-3 hover:bg-[#f4f9fc] sm:px-4 [&+li]:border-t">
      <Avatar src={post.author.avatarUrl} name={post.author.nickname} size={28} />
      <Link to={`/posts/${post.id}`} className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink hover:text-teal-ink">
        {post.title}
      </Link>
      <Link
        to={`/users/${post.author.id}`}
        className="hidden max-w-28 truncate text-[13px] text-ink-3 hover:text-teal-ink sm:inline"
      >
        {post.author.nickname}
      </Link>
      {/* 휴대폰에서는 제목 자리가 모자라서 패치·시간을 빼요. */}
      <span className="hidden sm:inline-flex">
        <VersionChip patch={post.gamePatch} />
      </span>
      <span className="hidden text-[13px] whitespace-nowrap text-ink-3 sm:inline">{relativeTime(post.createdAt)}</span>
      <span className="hidden text-[13px] whitespace-nowrap text-ink-3 sm:inline">조회 {formatCount(post.viewCount)}</span>
      <Likes count={post.likeCount} compact />
    </li>
  )
}

/** 금색 삼각형 + 추천 수. 0이면 흐리게 해서 인기 글이 바로 보여요. "추천"은 화면 읽기 프로그램용 숨김 글자예요. */
function Likes({ count, compact = false }: { count: number; compact?: boolean }) {
  return (
    <div
      data-likes={count}
      className={`flex font-bold tabular-nums ${count > 0 ? 'text-gold-deep' : 'text-vote-off'} ${
        compact ? 'min-w-10 items-center justify-end gap-1 text-[15px]' : 'flex-col items-center gap-0.5 pt-1 text-[17px] leading-tight'
      }`}
    >
      <span aria-hidden="true" className="h-[9px] w-3 bg-current [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
      <span className="sr-only">추천 </span>
      <span>{count}</span>
    </div>
  )
}

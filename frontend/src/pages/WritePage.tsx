import type { JSONContent } from '@tiptap/core'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useAugments, useChampions, usePatches } from '../api/gamedata'
import { startDiscordLogin, useMe } from '../api/me'
import { createPost, updatePost, usePost } from '../api/posts'
import type { Augment, Champion, Patches, PostDetail } from '../api/types'
import TagPicker from '../components/TagPicker'
import { useToast } from '../components/toastContext'
import { buttonClass } from '../components/ui/button'
import EmptyState from '../components/ui/EmptyState'
import { DiscordIcon } from '../components/ui/icons'
import { PAGE_NARROW } from '../components/ui/layout'
import VersionChip from '../components/ui/VersionChip'
import { cleanContent } from '../editor/cleanContent'
import PostEditor from '../editor/PostEditor'
import { parseRouteId } from '../lib/routeId'
import NotFoundPage from './NotFoundPage'

const LEAVE_MESSAGE = '작성 중인 내용이 사라져요. 나갈까요?'

/** 글쓰기(/write)와 글 수정(/posts/:postId/edit). */
export default function WritePage() {
  const params = useParams()
  const editId = params.postId ? (parseRouteId(params.postId) ?? Number.NaN) : null
  const { data: me, isPending: meLoading } = useMe()
  const location = useLocation()
  const post = usePost(editId ?? Number.NaN)
  const champions = useChampions()
  const augments = useAugments()
  const patches = usePatches()
  // 한 번 로그인 상태로 폼을 열었다면, 나중에 로그인이 풀려도 쓰던 내용을 지키려고 폼을 그대로 둬요.
  const [hadSession, setHadSession] = useState(false)
  if (me && !hadSession) setHadSession(true)

  if (meLoading) return null
  if (!me && !hadSession) {
    return (
      <EmptyState
        title="글을 쓰려면 로그인이 필요해요"
        action={
          <button type="button" onClick={() => startDiscordLogin(location.pathname)} className={buttonClass('discord', 44)}>
            <DiscordIcon className="h-5 w-5" />
            로그인하고 글쓰기
          </button>
        }
      />
    )
  }
  if (editId !== null) {
    if (Number.isNaN(editId) || post.error || (post.data && me && post.data.author.id !== me.id)) return <NotFoundPage message="없는 글이에요" />
    if (post.isPending) return null
  }
  if (patches.isPending) return null

  return (
    <PostForm
      key={editId ?? 'new'}
      editId={editId}
      initial={editId !== null ? post.data! : null}
      champions={champions.data ?? []}
      augments={augments.data ?? []}
      patches={patches.data ?? { current: null, patches: [] }}
    />
  )
}

type FormProps = {
  editId: number | null
  initial: PostDetail | null
  champions: Champion[]
  augments: Augment[]
  patches: Patches
}

function PostForm({ editId, initial, champions, augments, patches }: FormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const bodyLabelId = useId()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState<JSONContent | null>(initial?.content ?? null)
  const [championIds, setChampionIds] = useState<string[]>(initial?.champions.map((c) => c.id) ?? [])
  const [augmentIds, setAugmentIds] = useState<string[]>(initial?.augments.map((a) => a.id) ?? [])
  const [gamePatch, setGamePatch] = useState(initial?.gamePatch ?? patches.current ?? patches.patches[0] ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  // 본문 영상 칸 중 올리는 중·변환 중(busy)과 실패한(failed) 수. 등록 잠금에 써요.
  const [clips, setClips] = useState({ busy: 0, failed: 0 })
  const leaving = useRef(false)

  const augmentItems = [...augments, ...(initial?.augments.filter((a) => !augments.some((x) => x.id === a.id)) ?? [])]
  const augmentOptions = augments.filter((a) => a.active)
  const patchOptions =
    initial && !patches.patches.includes(initial.gamePatch) ? [...patches.patches, initial.gamePatch] : patches.patches

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(LEAVE_MESSAGE)) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function change<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setDirty(true)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (clips.busy > 0) return
    if (clips.failed > 0) {
      toast.show('변환하지 못한 영상을 빼거나 다시 올려 주세요')
      return
    }
    setSubmitting(true)
    setErrors({})
    const body = {
      title,
      content: cleanContent(content ?? { type: 'doc', content: [] }),
      championIds,
      augmentIds,
      gamePatch,
    }
    try {
      const id = editId ?? (await createPost(body)).id
      if (editId !== null) await updatePost(editId, body)
      leaving.current = true
      await queryClient.invalidateQueries({ queryKey: ['posts'] })
      navigate(`/posts/${id}`, { replace: true })
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.fieldErrors) setErrors(e.fieldErrors)
        if (e.status === 401) setSessionExpired(true)
        if (e.status === 401 || !e.fieldErrors) toast.show(e.message)
      } else {
        toast.show('잠시 후 다시 시도해주세요')
      }
      setSubmitting(false)
    }
  }

  const fieldError = (key: string) => errors[key] && <p className="mt-1 text-sm text-danger">{errors[key]}</p>
  const label = 'mb-2 block text-[15px] font-bold text-ink'
  const help = 'mt-1.5 text-[13px] text-ink-3'
  const counter = (n: number, max: number) => (
    <span className="text-[13px] text-ink-3 tabular-nums">
      {n} / {max}
    </span>
  )

  return (
    <form onSubmit={submit} className={PAGE_NARROW}>
      <h1 className="mb-4 font-display text-[28px] leading-tight text-night">{editId !== null ? '글 수정' : '글쓰기'}</h1>
      {sessionExpired && (
        <div className="mb-4 flex flex-wrap items-center gap-3 border border-gold bg-[#fbf6ea] px-4 py-3 text-sm text-ink">
          <span>로그인이 풀렸어요. 쓰던 내용은 그대로 있으니, 새 탭에서 다시 로그인한 뒤 등록을 다시 눌러주세요.</span>
          <button
            type="button"
            onClick={() => {
              window.open('/oauth2/authorization/discord', '_blank')
              setSessionExpired(false)
            }}
            className={buttonClass('discord', 40)}
          >
            새 탭에서 다시 로그인
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6 border border-line-soft bg-surface p-4 sm:p-8">
        <div>
          <label htmlFor="post-title" className={label}>
            제목
          </label>
          <input
            id="post-title"
            value={title}
            onChange={(e) => change(setTitle)(e.target.value)}
            maxLength={100}
            className="h-12 w-full rounded-touch border border-line bg-white px-3.5 text-[17px] font-bold text-ink focus:border-teal focus:ring-3 focus:ring-teal-hi/20 focus:outline-none"
          />
          {fieldError('title')}
        </div>

        <div>
          <span id={bodyLabelId} className={label}>
            본문
          </span>
          <PostEditor
            initialContent={initial?.content ?? null}
            onChange={change(setContent)}
            onError={toast.show}
            onPendingChange={setClips}
            labelledBy={bodyLabelId}
          />
          {fieldError('content')}
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className={label}>챔피언</span>
            {counter(championIds.length, 5)}
          </div>
          <TagPicker<Champion>
            label="챔피언"
            items={champions}
            options={champions}
            selected={championIds}
            onChange={change(setChampionIds)}
            max={5}
            iconOf={(c) => c.imageUrl}
            round
            placeholder="이름 일부만 쳐도 찾아져요. 예: 아무"
          />
          {fieldError('championIds')}
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className={label}>증강</span>
            {counter(augmentIds.length, 10)}
          </div>
          <TagPicker<Augment>
            label="증강"
            items={augmentItems}
            options={augmentOptions}
            selected={augmentIds}
            onChange={change(setAugmentIds)}
            max={10}
            iconOf={(a) => a.iconUrl}
            augmentOf={(a) => ({ rarity: a.rarity, tinted: a.iconTinted })}
            placeholder="증강 검색…"
          />
          {fieldError('augmentIds')}
        </div>

        <div>
          <label htmlFor="post-patch" className={label}>
            패치
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <select
              id="post-patch"
              value={gamePatch}
              onChange={(e) => change(setGamePatch)(e.target.value)}
              className="h-12 min-w-56 rounded-touch border border-line bg-white px-3 text-[15px] text-ink focus:border-teal focus:ring-3 focus:ring-teal-hi/20 focus:outline-none"
            >
              {patchOptions.map((p) => (
                <option key={p} value={p}>
                  {p === patches.current ? `${p} 버전 (최신)` : `${p} 버전`}
                </option>
              ))}
            </select>
            {gamePatch && <VersionChip patch={gamePatch} />}
          </div>
          <p className={help}>현재 패치가 자동으로 골라져 있어요. 지난 패치 경험을 쓸 때만 바꾸세요.</p>
          {fieldError('gamePatch')}
        </div>
      </div>

      {/* 글이 길어져도 스크롤 없이 누를 수 있게 화면 아래에 붙어 있어요. */}
      <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-2 border-t border-line bg-white/95 px-3 py-3 shadow-[0_-4px_16px_#0c1f2e14] sm:px-4">
        {clips.busy > 0 ? (
          <span className="flex-1 text-[13px] text-ink-3 max-sm:basis-full">영상 변환이 끝나면 등록할 수 있어요</span>
        ) : (
          <span className="flex-1 max-sm:hidden" />
        )}
        <button
          type="button"
          onClick={() => navigate(editId !== null ? `/posts/${editId}` : '/')}
          className={buttonClass('ghost', 44)}
        >
          취소
        </button>
        <button type="submit" disabled={submitting || clips.busy > 0} className={`${buttonClass('primary', 44)} min-w-[120px] max-sm:flex-1`}>
          {editId !== null ? '수정 완료' : '등록'}
        </button>
      </div>
    </form>
  )
}

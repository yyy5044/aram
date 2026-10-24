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
import PostEditor from '../editor/PostEditor'
import NotFoundPage from './NotFoundPage'

const LEAVE_MESSAGE = '작성 중인 내용이 사라져요. 나갈까요?'

/** 글쓰기(/write)와 글 수정(/posts/:postId/edit). */
export default function WritePage() {
  const params = useParams()
  const editId = params.postId ? Number(params.postId) : null
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
      <section className="py-16 text-center">
        <p className="mb-4 text-slate-300">글을 쓰려면 로그인이 필요해요</p>
        <button
          type="button"
          onClick={() => startDiscordLogin(location.pathname)}
          className="rounded-lg bg-indigo-500 px-4 py-2 font-bold text-white"
        >
          로그인하고 글쓰기
        </button>
      </section>
    )
  }
  if (editId !== null) {
    if (post.error || (post.data && me && post.data.author.id !== me.id)) return <NotFoundPage message="없는 글이에요" />
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
    setSubmitting(true)
    setErrors({})
    const body = {
      title,
      content: content ?? { type: 'doc', content: [] },
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

  const fieldError = (key: string) => errors[key] && <p className="mt-1 text-sm text-rose-400">{errors[key]}</p>
  const label = 'mt-4 mb-1.5 block text-sm text-slate-400'

  return (
    <form onSubmit={submit}>
      <h1 className="mb-2 text-xl font-bold">{editId !== null ? '글 수정' : '글쓰기'}</h1>
      {sessionExpired && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-700 bg-amber-950/60 px-3 py-2.5 text-sm text-amber-100">
          <span>로그인이 풀렸어요. 쓰던 내용은 그대로 있으니, 새 탭에서 다시 로그인한 뒤 등록을 다시 눌러주세요.</span>
          <button
            type="button"
            onClick={() => {
              window.open('/oauth2/authorization/discord', '_blank')
              setSessionExpired(false)
            }}
            className="rounded-md bg-indigo-500 px-3 py-1 font-bold text-white"
          >
            새 탭에서 다시 로그인
          </button>
        </div>
      )}

      <label htmlFor="post-title" className={label}>
        제목
      </label>
      <input
        id="post-title"
        value={title}
        onChange={(e) => change(setTitle)(e.target.value)}
        maxLength={100}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100"
      />
      {fieldError('title')}

      <span id={bodyLabelId} className={label}>
        본문
      </span>
      <PostEditor
        initialContent={initial?.content ?? null}
        onChange={change(setContent)}
        onError={toast.show}
        labelledBy={bodyLabelId}
      />
      {fieldError('content')}

      <div className="mt-5 border-t border-slate-800 pt-1">
        <span className={label}>챔피언</span>
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

        <span className={label}>증강</span>
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

        <label htmlFor="post-patch" className={label}>
          패치
        </label>
        <select
          id="post-patch"
          value={gamePatch}
          onChange={(e) => change(setGamePatch)(e.target.value)}
          className="min-w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        >
          {patchOptions.map((p) => (
            <option key={p} value={p}>
              {p === patches.current ? `${p} (현재 패치)` : p}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">현재 패치가 자동으로 골라져 있어요. 지난 패치 경험을 쓸 때만 바꾸세요.</p>
        {fieldError('gamePatch')}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-amber-300 px-5 py-2.5 font-extrabold text-slate-900 disabled:opacity-60"
        >
          {editId !== null ? '수정 완료' : '등록'}
        </button>
      </div>
    </form>
  )
}

import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { IMAGE_TYPES, MAX_IMAGE_BYTES, uploadImage } from '../api/images'
import { meKey, startDiscordLogin, useMe } from '../api/me'
import { updateProfile } from '../api/profile'
import type { Me } from '../api/types'
import Avatar from '../components/Avatar'
import { useToast } from '../components/toastContext'

/** 프로필 수정: 사진, 닉네임, 공개 설정을 한 번에 저장해요. */
export default function ProfileEditPage() {
  const { data: me, isPending } = useMe()
  if (isPending) return null
  if (!me) {
    return (
      <section className="py-16 text-center">
        <p className="mb-4 text-slate-300">프로필을 바꾸려면 로그인이 필요해요</p>
        <button
          type="button"
          onClick={() => startDiscordLogin('/settings/profile')}
          className="rounded-lg bg-indigo-500 px-4 py-2 font-bold text-white"
        >
          로그인하고 프로필 수정하기
        </button>
      </section>
    )
  }
  return <ProfileForm key={me.id} me={me} />
}

function ProfileForm({ me }: { me: Me }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)

  const [nickname, setNickname] = useState(me.nickname ?? '')
  const [imageId, setImageId] = useState<string | null>(me.profileImageId)
  const [preview, setPreview] = useState<string | null>(me.avatarUrl)
  const [profilePublic, setProfilePublic] = useState(me.profilePublic)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function pickPhoto(file: File | undefined) {
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.show('jpg, png, webp, gif 이미지만 올릴 수 있어요')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.show('이미지는 10MB 이하만 올릴 수 있어요')
      return
    }
    setUploading(true)
    try {
      const uploaded = await uploadImage(file)
      setImageId(uploaded.id)
      setPreview(uploaded.url)
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : '이미지를 올리지 못했어요')
    } finally {
      setUploading(false)
    }
  }

  function revertToDiscord() {
    setImageId(null)
    setPreview(me.discordAvatarUrl)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const updated = await updateProfile({ nickname, profileImageId: imageId, profilePublic })
      queryClient.setQueryData(meKey, updated)
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.show('프로필을 저장했어요')
      navigate(`/users/${me.id}`)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'NICKNAME_TAKEN') setErrors({ nickname: e.message })
      else if (e instanceof ApiError && e.fieldErrors) setErrors(e.fieldErrors)
      else toast.show(e instanceof ApiError ? e.message : '잠시 후 다시 시도해주세요')
      setSaving(false)
    }
  }

  const label = 'mt-5 mb-1.5 block text-sm text-slate-400'
  const fieldError = (key: string) => errors[key] && <p className="mt-1 text-sm text-rose-400">{errors[key]}</p>

  return (
    <form onSubmit={save} className="mx-auto max-w-lg">
      <h1 className="text-xl font-bold">프로필 수정</h1>

      <span className={label}>프로필 사진</span>
      <div className="flex flex-wrap items-center gap-3">
        <span data-testid="profile-preview">
          <Avatar src={preview} size={72} />
        </span>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-60"
        >
          사진 바꾸기
        </button>
        <button
          type="button"
          disabled={imageId === null}
          onClick={revertToDiscord}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-800 disabled:opacity-40"
        >
          디스코드 사진으로 되돌리기
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          aria-label="프로필 사진 고르기"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            void pickPhoto(file)
          }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">jpg, png, webp, gif · 10MB 이하. 동그랗게 잘려서 보여요.</p>
      {fieldError('profileImageId')}

      <label htmlFor="profile-nickname" className={label}>
        닉네임
      </label>
      <input
        id="profile-nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={20}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100"
      />
      <p className="mt-1 text-xs text-slate-500">2~12자 한글, 영문, 숫자, 밑줄</p>
      {fieldError('nickname')}

      <span className={label}>공개 설정</span>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900 p-3">
        <div>
          <b className="text-sm">프로필 공개</b>
          <p className="mt-0.5 text-xs text-slate-400">
            끄면 다른 친구에게는 자물쇠와 안내 문구만 보여요. 글과 댓글은 게시판에서 그대로 보여요.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={profilePublic}
          aria-label="프로필 공개"
          onClick={() => setProfilePublic((v) => !v)}
          className={`relative h-6 w-11 flex-none rounded-full transition ${profilePublic ? 'bg-emerald-500' : 'bg-slate-600'}`}
        >
          <span
            className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all ${profilePublic ? 'left-[23px]' : 'left-[3px]'}`}
          />
        </button>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Link to={`/users/${me.id}`} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">
          취소
        </Link>
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-lg bg-amber-300 px-5 py-2 font-extrabold text-slate-900 disabled:opacity-60"
        >
          저장
        </button>
      </div>
    </form>
  )
}
